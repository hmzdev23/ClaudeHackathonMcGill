import { runAgentStream } from '@/lib/claude/agent';
import { AUTOPILOT_TOOLS } from '@/lib/claude/autopilot-tools';
import { handleAutopilotToolCall } from '@/lib/claude/autopilot-handlers';
import { AUTOPILOT_SYSTEM_PROMPT } from '@/lib/claude/prompts';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const stream = runAgentStream(
      [
        {
          role: 'user',
          content:
            'Run a full analysis of all expense data and produce an action plan. Follow your workflow: check KPIs, pending approvals, violations, anomalies, and budgets. Then output_action_plan with your complete findings.',
        },
      ],
      AUTOPILOT_SYSTEM_PROMPT,
      AUTOPILOT_TOOLS,
      handleAutopilotToolCall
    );

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
