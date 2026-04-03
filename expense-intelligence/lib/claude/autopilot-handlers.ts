import { getDb } from '../db';
import { handleToolCall } from './tool-handlers';

/**
 * Extended tool handler for the autopilot agent.
 * Handles autopilot-only tools; delegates all others to the standard handler.
 */
export function handleAutopilotToolCall(
  toolName: string,
  input: Record<string, unknown>
): unknown {
  switch (toolName) {
    case 'get_pending_approvals': {
      const db = getDb();
      const approvals = db
        .prepare(
          `SELECT a.id, a.transaction_id, a.employee_id, a.amount, a.merchant,
                  a.description, a.ai_recommendation, a.ai_reasoning,
                  a.status, a.created_at,
                  e.name as employee_name, e.department, e.role
           FROM approvals a
           LEFT JOIN employees e ON e.id = a.employee_id
           WHERE a.status = 'pending'
           ORDER BY a.amount DESC`
        )
        .all() as Array<{
        id: string;
        transaction_id: string;
        employee_id: string;
        amount: number;
        merchant: string;
        description: string;
        ai_recommendation: string;
        ai_reasoning: string;
        status: string;
        created_at: string;
        employee_name: string;
        department: string;
        role: string;
      }>;

      return {
        count: approvals.length,
        pending_approvals: approvals,
      };
    }

    case 'output_action_plan':
      // Return with special key so the agent loop detects it and emits action_plan event
      return { _action_plan: input };

    default:
      return handleToolCall(toolName, input);
  }
}
