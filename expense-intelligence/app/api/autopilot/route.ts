import { runDemoAutopilotStream } from '@/lib/claude/demo-agent';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await req.json().catch(() => ({}));

    const stream = runDemoAutopilotStream();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to start analysis' },
      { status: 500 }
    );
  }
}
