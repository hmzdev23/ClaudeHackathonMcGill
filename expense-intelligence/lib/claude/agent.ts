import { getClaudeClient, MODEL } from './client';
import { EXPENSE_TOOLS } from './tools';
import { handleToolCall } from './tool-handlers';
import { SYSTEM_PROMPT } from './prompts';
import type Anthropic from '@anthropic-ai/sdk';

const MAX_ITERATIONS = 8;
const STREAM_RETRIES = 4;

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
  type: 'text_delta' | 'tool_call' | 'visualization' | 'done' | 'error';
  content?: string;
  tool?: string;
  visualization?: VisualizationSpec;
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
      if (isOverloadedError(err) && attempt < STREAM_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s, 8s
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
 * Streaming agentic loop — used by POST /api/query.
 * Returns a ReadableStream of newline-delimited JSON AgentStreamEvent objects.
 */
export function runAgentStream(
  messages: Anthropic.Messages.MessageParam[],
  systemPrompt: string = SYSTEM_PROMPT
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const client = getClaudeClient();
        let currentMessages = [...messages];
        let iteration = 0;

        while (iteration < MAX_ITERATIONS) {
          iteration++;

          const { completedToolUseBlocks, finalMessage } = await runOneIteration(
            client,
            {
              model: MODEL,
              max_tokens: 4096,
              system: systemPrompt,
              tools: EXPENSE_TOOLS,
              messages: currentMessages,
            },
            send
          );

          // No tool calls → done
          if (completedToolUseBlocks.length === 0) break;

          // Execute all tool calls
          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

          for (const toolBlock of completedToolUseBlocks) {
            let output: unknown;
            try {
              output = handleToolCall(toolBlock.name, toolBlock.input as Record<string, unknown>);
            } catch (err) {
              output = { error: err instanceof Error ? err.message : String(err) };
            }

            if (
              toolBlock.name === 'render_visualization' &&
              output !== null &&
              typeof output === 'object' &&
              '_visualization' in (output as object)
            ) {
              send({ type: 'visualization', visualization: (output as { _visualization: VisualizationSpec })._visualization });
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
  withTools = false
): Promise<string> {
  const client = getClaudeClient();

  for (let attempt = 0; attempt <= STREAM_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
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
