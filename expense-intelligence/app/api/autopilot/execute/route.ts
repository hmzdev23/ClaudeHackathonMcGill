import { updateApprovalStatus } from '@/lib/db/queries';
import type { NextRequest } from 'next/server';
import type { ActionItem } from '@/lib/claude/agent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { actions }: { actions: ActionItem[] } = await request.json();

    if (!Array.isArray(actions) || actions.length === 0) {
      return Response.json({ error: 'No actions provided' }, { status: 400 });
    }

    const results: Array<{ id: string; success: boolean; error?: string; acknowledged?: boolean }> = [];

    for (const action of actions) {
      if (action.type === 'approve_expense' || action.type === 'deny_expense') {
        if (!action.target_id) {
          results.push({ id: action.id, success: false, error: 'Missing target_id' });
          continue;
        }
        try {
          updateApprovalStatus(
            action.target_id,
            action.type === 'approve_expense' ? 'approved' : 'denied'
          );
          results.push({ id: action.id, success: true });
        } catch (err) {
          results.push({
            id: action.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      } else {
        // Informational actions — mark as acknowledged
        results.push({ id: action.id, success: true, acknowledged: true });
      }
    }

    const executed = results.filter((r) => r.success && !r.acknowledged).length;
    const acknowledged = results.filter((r) => r.acknowledged).length;
    const failed = results.filter((r) => !r.success).length;

    return Response.json({ results, executed, acknowledged, failed });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
