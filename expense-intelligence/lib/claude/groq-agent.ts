import Groq from 'groq-sdk';
import type Anthropic from '@anthropic-ai/sdk';
import type { AgentStreamEvent, VisualizationSpec, ActionPlan } from './agent';
import { handleToolCall } from './tool-handlers';
import { EXPENSE_TOOLS } from './tools';
import { SYSTEM_PROMPT } from './prompts';

// Default Groq model — override via ALT_MODEL env var
export const GROQ_MODEL = process.env.ALT_MODEL || 'llama-3.3-70b-versatile';

const MAX_ITERATIONS = 8;
const STREAM_RETRIES = 1;

let groqClient: Groq | null = null;
let groqClient2: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.ALT_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ALT_ANTHROPIC_API_KEY (Groq key) is not set.');
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

function getGroqClient2(): Groq | null {
  const apiKey = process.env.ALT_ANTHROPIC_API_KEY_2;
  if (!apiKey) return null;
  if (!groqClient2) groqClient2 = new Groq({ apiKey });
  return groqClient2;
}

function isRateLimit(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('429') || err.message.includes('rate_limit') || err.message.includes('Rate limit');
}

// ---------------------------------------------------------------------------
// Convert Anthropic tool definitions → Groq/OpenAI function format
// ---------------------------------------------------------------------------
function toGroqTools(tools: Anthropic.Messages.Tool[]): Groq.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

type OAIMessage = Groq.Chat.ChatCompletionMessageParam;

// ---------------------------------------------------------------------------
// Streaming agentic loop using Groq
// ---------------------------------------------------------------------------
export function runGroqAgentStream(
  messages: Anthropic.Messages.MessageParam[],
  systemPrompt: string = SYSTEM_PROMPT,
  tools: Anthropic.Messages.Tool[] = EXPENSE_TOOLS,
  toolHandler: (name: string, input: Record<string, unknown>) => unknown = handleToolCall,
  maxIterations: number = MAX_ITERATIONS
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const client = getGroqClient();
        const groqTools = toGroqTools(tools);

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

          const pendingToolCalls: Record<number, { id: string; name: string; args: string }> = {};
          let assistantText = '';
          let finishReason: string | null = null;

          // Try primary key, fall back to secondary on rate limit
          const clients = [client, getGroqClient2()].filter(Boolean) as Groq[];
          let succeeded = false;

          for (const c of clients) {
            try {
              const stream = await c.chat.completions.create({
                model: GROQ_MODEL,
                messages: oaiMessages,
                tools: groqTools,
                tool_choice: 'auto',
                stream: true,
                max_tokens: 4096,
              });

              for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                  assistantText += delta.content;
                  send({ type: 'text_delta', content: delta.content });
                }

                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    if (!pendingToolCalls[idx]) {
                      pendingToolCalls[idx] = { id: tc.id ?? '', name: '', args: '' };
                      if (tc.function?.name) {
                        pendingToolCalls[idx].name = tc.function.name;
                        send({ type: 'tool_call', tool: tc.function.name, content: tc.function.name });
                      }
                    } else {
                      if (tc.id) pendingToolCalls[idx].id = tc.id;
                      if (tc.function?.name) pendingToolCalls[idx].name = tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      pendingToolCalls[idx].args += tc.function.arguments;
                    }
                  }
                }

                finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
              }
              succeeded = true;
              break; // key worked, stop trying
            } catch (err) {
              if (isRateLimit(err)) continue; // try next key
              throw err; // non-rate-limit error, propagate
            }
          }

          if (!succeeded) throw new Error('All Groq API keys are rate limited. Please wait and try again.');

          const toolCallsList = Object.values(pendingToolCalls);

          if (toolCallsList.length === 0) break;

          oaiMessages.push({
            role: 'assistant',
            content: assistantText || null,
            tool_calls: toolCallsList.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.args },
            })),
          } as OAIMessage);

          let planEmitted = false;

          for (const tc of toolCallsList) {
            let output: unknown;
            try {
              const input = JSON.parse(tc.args || '{}');
              output = toolHandler(tc.name, input);
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
              role: 'tool' as const,
              tool_call_id: tc.id,
              content: JSON.stringify(output),
            });
          }

          if (planEmitted) break;
        }

        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : 'Groq request failed' });
      } finally {
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Non-streaming single call using Groq (for compliance, reports)
// ---------------------------------------------------------------------------
export async function runGroqAgentOnce(
  userPrompt: string,
  systemPrompt: string
): Promise<string> {
  const clients = [getGroqClient(), getGroqClient2()].filter(Boolean) as Groq[];

  for (const c of clients) {
    try {
      const response = await c.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      return response.choices[0]?.message?.content ?? '';
    } catch (err) {
      if (isRateLimit(err)) continue;
      throw err;
    }
  }
  throw new Error('All Groq API keys are rate limited.');
}
