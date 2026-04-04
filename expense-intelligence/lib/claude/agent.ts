import { getClaudeClient, MODEL, ALT_MODEL } from './client';
import { EXPENSE_TOOLS } from './tools';
import { handleToolCall } from './tool-handlers';
import { SYSTEM_PROMPT } from './prompts';
import { runGroqAgentStream, runGroqAgentOnce } from './groq-agent';
import { runORAgentStream, runORAgentOnce } from './openrouter-agent';
import type Anthropic from '@anthropic-ai/sdk';

// ── Action Plan types (used by autopilot) ───────────────────────────────────
export interface ActionItem {
  id: string;
  type: 'approve_expense' | 'deny_expense' | 'budget_alert' | 'anomaly_alert' | 'compliance_alert' | 'vendor_opportunity';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  reasoning: string;
  target_id?: string;
  amount?: number;
  employee?: string;
  department?: string;
  auto_executable: boolean;
}

export interface ActionPlan {
  summary: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  actions: ActionItem[];
  insights: string[];
}

const MAX_ITERATIONS = 8;
const STREAM_RETRIES = 2; // reduced — SDK maxRetries is now 0

function isOverloadedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { status?: number };
  return (
    e.status === 529 ||
    e.message.includes('overloaded') ||
    e.message.includes('529') ||
    e.message.includes('Overloaded')
  );
}

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { status?: number };
  return e.status === 429 || e.message.includes('429') || e.message.includes('rate_limit');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface VisualizationSpec {
  type: 'bar' | 'line' | 'pie' | 'table' | 'number' | 'gauge';
  title: string;
  data: object[];
  x_key?: string;
  y_key?: string;
  color_key?: string;
  format?: 'currency' | 'percent' | 'number';
}

export interface AgentStreamEvent {
  type: 'text_delta' | 'tool_call' | 'visualization' | 'action_plan' | 'done' | 'error';
  content?: string;
  tool?: string;
  visualization?: VisualizationSpec;
  plan?: ActionPlan;
  error?: string;
}

/**
 * Runs one Claude streaming iteration with retry on overloaded errors.
 * Returns the collected tool use blocks and final message.
 */
async function runOneIteration(
  client: ReturnType<typeof getClaudeClient>,
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  send: (event: AgentStreamEvent) => void
): Promise<{
  completedToolUseBlocks: Anthropic.Messages.ToolUseBlock[];
  finalMessage: Anthropic.Messages.Message;
}> {
  for (let attempt = 0; attempt <= STREAM_RETRIES; attempt++) {
    const pendingToolUse: Record<string, { id: string; name: string; input_json: string }> = {};
    const completedToolUseBlocks: Anthropic.Messages.ToolUseBlock[] = [];

    try {
      const stream = client.messages.stream(params);

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            pendingToolUse[event.index] = {
              id: event.content_block.id,
              name: event.content_block.name,
              input_json: '',
            };
            send({ type: 'tool_call', tool: event.content_block.name, content: event.content_block.name });
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            send({ type: 'text_delta', content: event.delta.text });
          } else if (event.delta.type === 'input_json_delta') {
            const pending = pendingToolUse[event.index];
            if (pending) pending.input_json += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          const pending = pendingToolUse[event.index];
          if (pending) {
            try {
              const input = JSON.parse(pending.input_json || '{}');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              completedToolUseBlocks.push({ type: 'tool_use', id: pending.id, name: pending.name, input } as any);
            } catch {
              // malformed JSON from partial stream — skip
            }
            delete pendingToolUse[event.index];
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      return { completedToolUseBlocks, finalMessage };

    } catch (err) {
      if (isRateLimitError(err)) {
        // Rate limit — wait 15s then retry once
        if (attempt === 0) {
          send({ type: 'text_delta', content: '\n\n*Rate limit reached — waiting 15 seconds before retrying…*\n\n' });
          await sleep(15000);
          continue;
        }
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (isOverloadedError(err) && attempt < STREAM_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt);
        send({ type: 'text_delta', content: attempt === 0 ? '\n\n*Claude is busy — retrying…*' : '' });
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Claude is overloaded. Please try again in a few seconds.');
}

/**
 * Streaming agentic loop — used by POST /api/query and POST /api/autopilot.
 * Returns a ReadableStream of newline-delimited JSON AgentStreamEvent objects.
 */
export function runAgentStream(
  messages: Anthropic.Messages.MessageParam[],
  systemPrompt: string = SYSTEM_PROMPT,
  tools: Anthropic.Messages.Tool[] = EXPENSE_TOOLS,
  toolHandler: (name: string, input: Record<string, unknown>) => unknown = handleToolCall,
  maxIterations: number = MAX_ITERATIONS,
  useAlt: boolean | 'groq' | 'openrouter' = false
): ReadableStream<Uint8Array> {
  if (useAlt === 'openrouter') {
    return runORAgentStream(messages, systemPrompt, tools, toolHandler, maxIterations);
  }
  if (useAlt === true || useAlt === 'groq') {
    return runGroqAgentStream(messages, systemPrompt, tools, toolHandler, maxIterations);
  }

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const client = getClaudeClient(useAlt);
        const model = useAlt ? ALT_MODEL : MODEL;
        let currentMessages = [...messages];
        let iteration = 0;

        while (iteration < maxIterations) {
          iteration++;

          const { completedToolUseBlocks, finalMessage } = await runOneIteration(
            client,
            {
              model,
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages: currentMessages,
            },
            send
          );

          // No tool calls → done
          if (completedToolUseBlocks.length === 0) break;

          // Execute all tool calls
          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
          let planEmitted = false;

          for (const toolBlock of completedToolUseBlocks) {
            let output: unknown;
            try {
              output = toolHandler(toolBlock.name, toolBlock.input as Record<string, unknown>);
            } catch (err) {
              output = { error: err instanceof Error ? err.message : String(err) };
            }

            if (
              output !== null &&
              typeof output === 'object' &&
              '_visualization' in (output as object)
            ) {
              send({ type: 'visualization', visualization: (output as { _visualization: VisualizationSpec })._visualization });
            }

            if (
              output !== null &&
              typeof output === 'object' &&
              '_action_plan' in (output as object)
            ) {
              send({ type: 'action_plan', plan: (output as { _action_plan: ActionPlan })._action_plan });
              planEmitted = true;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(output),
            });
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: finalMessage.content },
            { role: 'user', content: toolResults },
          ];

          // After emitting the action plan, stop the loop
          if (planEmitted) break;
        }

        send({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', error: message });
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Non-streaming agent call — used by compliance scan, approval generation, report generation.
 */
export async function runAgentOnce(
  userPrompt: string,
  systemPrompt: string,
  withTools = false,
  useAlt: boolean | 'groq' | 'openrouter' = false
): Promise<string> {
  if (useAlt === 'openrouter') {
    return runORAgentOnce(userPrompt, systemPrompt);
  }
  if (useAlt === true || useAlt === 'groq') {
    return runGroqAgentOnce(userPrompt, systemPrompt);
  }

  const client = getClaudeClient(useAlt);
  const model = useAlt ? ALT_MODEL : MODEL;

  for (let attempt = 0; attempt <= STREAM_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        ...(withTools ? { tools: EXPENSE_TOOLS } : {}),
      });

      return response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

    } catch (err) {
      if (isOverloadedError(err) && attempt < STREAM_RETRIES) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Claude is overloaded. Please try again.');
}
