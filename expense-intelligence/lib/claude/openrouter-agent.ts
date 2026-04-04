import type Anthropic from '@anthropic-ai/sdk';
import type { AgentStreamEvent, VisualizationSpec, ActionPlan } from './agent';
import { handleToolCall } from './tool-handlers';
import { EXPENSE_TOOLS } from './tools';
import { SYSTEM_PROMPT } from './prompts';

export const OPENROUTER_MODEL = 'minimax/minimax-m2.5:free';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

const MAX_ITERATIONS = 8;
const STREAM_RETRIES = 1;

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set.');
  return key;
}

type OAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

function toOAITools(tools: Anthropic.Messages.Tool[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.input_schema,
    },
  }));
}

interface ORDelta {
  content?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface ORChunk {
  choices?: Array<{ delta?: ORDelta; finish_reason?: string | null }>;
}

/** Stream a single OpenRouter request and collect text + tool call deltas. */
async function streamOnce(
  messages: OAIMessage[],
  tools: ReturnType<typeof toOAITools>,
  onText: (t: string) => void,
  onToolName: (name: string) => void,
): Promise<{
  toolCalls: Array<{ id: string; name: string; args: string }>;
  finishReason: string | null;
}> {
  const res = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const pending: Record<number, { id: string; name: string; args: string }> = {};
  let finishReason: string | null = null;

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') break;
      let chunk: ORChunk;
      try { chunk = JSON.parse(raw); } catch { continue; }

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        // Strip Qwen reasoning tokens
        const visible = delta.content
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/<think>[\s\S]*/g, '');
        if (visible) onText(visible);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!pending[idx]) {
            pending[idx] = { id: tc.id ?? '', name: '', args: '' };
            if (tc.function?.name) {
              pending[idx].name = tc.function.name;
              onToolName(tc.function.name);
            }
          } else {
            if (tc.id) pending[idx].id = tc.id;
            if (tc.function?.name) pending[idx].name = tc.function.name;
          }
          if (tc.function?.arguments) pending[idx].args += tc.function.arguments;
        }
      }

      finishReason = chunk.choices?.[0]?.finish_reason ?? finishReason;
    }
  }

  return { toolCalls: Object.values(pending), finishReason };
}

// ---------------------------------------------------------------------------
// Streaming agentic loop
// ---------------------------------------------------------------------------
export function runORAgentStream(
  messages: Anthropic.Messages.MessageParam[],
  systemPrompt: string = SYSTEM_PROMPT,
  tools: Anthropic.Messages.Tool[] = EXPENSE_TOOLS,
  toolHandler: (name: string, input: Record<string, unknown>) => unknown = handleToolCall,
  maxIterations: number = MAX_ITERATIONS,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));

      try {
        const oaiTools = toOAITools(tools);
        const oaiMessages: OAIMessage[] = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          })),
        ];

        let iteration = 0;

        while (iteration < maxIterations) {
          iteration++;

          let { toolCalls } = await streamOnce(
            oaiMessages,
            oaiTools,
            (text) => send({ type: 'text_delta', content: text }),
            (name) => send({ type: 'tool_call', tool: name, content: name }),
          );

          if (toolCalls.length === 0) break;

          oaiMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.args },
            })),
          });

          let planEmitted = false;

          for (const tc of toolCalls) {
            let output: unknown;
            try {
              output = toolHandler(tc.name, JSON.parse(tc.args || '{}'));
            } catch (err) {
              output = { error: err instanceof Error ? err.message : String(err) };
            }

            if (output !== null && typeof output === 'object' && '_visualization' in (output as object)) {
              send({ type: 'visualization', visualization: (output as { _visualization: VisualizationSpec })._visualization });
            }
            if (output !== null && typeof output === 'object' && '_action_plan' in (output as object)) {
              send({ type: 'action_plan', plan: (output as { _action_plan: ActionPlan })._action_plan });
              planEmitted = true;
            }

            oaiMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(output),
            });
          }

          if (planEmitted) break;
        }

        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : 'OpenRouter request failed' });
      } finally {
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Non-streaming single call
// ---------------------------------------------------------------------------
export async function runORAgentOnce(
  userPrompt: string,
  systemPrompt: string,
): Promise<string> {
  for (let attempt = 0; attempt <= STREAM_RETRIES; attempt++) {
    try {
      const res = await fetch(OPENROUTER_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? '';
      return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    } catch (err) {
      if (attempt < STREAM_RETRIES) continue;
      throw err;
    }
  }
  throw new Error('OpenRouter request failed.');
}
