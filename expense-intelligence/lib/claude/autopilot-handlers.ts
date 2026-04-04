import { getDb } from '../db';
import { handleToolCall } from './tool-handlers';

/**
 * Extended tool handler for the autopilot agent.
 * Returns trimmed payloads to stay within the 10k tokens/min rate limit.
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
          `SELECT a.id, a.employee_id, a.amount, a.merchant, a.description,
                  a.ai_recommendation, a.status, a.created_at,
                  e.name as employee_name, e.department
           FROM approvals a
           LEFT JOIN employees e ON e.id = a.employee_id
           WHERE a.status = 'pending'
           ORDER BY a.amount DESC
           LIMIT 10`
        )
        .all() as Array<{
        id: string; employee_id: string; amount: number; merchant: string;
        description: string; ai_recommendation: string; status: string;
        created_at: string; employee_name: string; department: string;
      }>;

      return { count: approvals.length, pending_approvals: approvals };
    }

    case 'output_action_plan':
      return { _action_plan: input };

    case 'detect_anomalies': {
      // Limit each anomaly type to 5 records to reduce token usage
      const result = handleToolCall(toolName, input) as Record<string, unknown>;
      const trimmed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(result)) {
        if (Array.isArray(val)) {
          trimmed[key] = val.slice(0, 5);
        } else {
          trimmed[key] = val;
        }
      }
      return trimmed;
    }

    case 'get_violations': {
      const result = handleToolCall(toolName, input) as { violations?: unknown[]; repeat_offenders?: unknown[] };
      return {
        violations: (result.violations || []).slice(0, 10),
        repeat_offenders: (result.repeat_offenders || []).slice(0, 5),
      };
    }

    case 'query_transactions': {
      // Ensure there's always a limit to avoid huge payloads
      const limitedInput = { limit: 20, ...input };
      return handleToolCall(toolName, limitedInput);
    }

    default:
      return handleToolCall(toolName, input);
  }
}
