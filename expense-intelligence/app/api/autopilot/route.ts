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
            'Run the full advisory analysis now. Call tools in this exact order: (1) get_dashboard_kpis, (2) get_pending_approvals, (3) get_violations, (4) detect_anomalies, (5) get_budget_status. After you have called ALL five tools and analyzed the results, you MUST call output_action_plan as your final action. Do not stop until you have called output_action_plan.',
        },
      ],
      AUTOPILOT_SYSTEM_PROMPT,
      AUTOPILOT_TOOLS,
      handleAutopilotToolCall,
      12  // higher iteration limit for multi-tool autopilot workflow
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
