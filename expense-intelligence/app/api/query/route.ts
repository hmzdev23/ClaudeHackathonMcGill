import { runAgentStream } from '@/lib/claude/agent';
import { SYSTEM_PROMPT } from '@/lib/claude/prompts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, history = [], use_alt_model = false } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const messages = [
      ...history,
      { role: 'user' as const, content: message },
    ];

    const stream = runAgentStream(messages, SYSTEM_PROMPT, undefined, undefined, undefined, use_alt_model);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Query failed' },
      { status: 500 }
    );
  }
}
