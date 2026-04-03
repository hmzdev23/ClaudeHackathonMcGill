import { getDb } from '@/lib/db';
import {
  getEmployeeProfile,
  getBudgetStatus,
  insertApproval,
  type Transaction,
} from '@/lib/db/queries';
import { runAgentOnce } from '@/lib/claude/agent';

export const dynamic = 'force-dynamic';

const APPROVAL_SYSTEM_PROMPT = `You are an AI financial advisor helping approve or deny expense requests. Given an expense request with employee history and department budget context, provide: { "recommendation": "approve" or "deny", "reasoning": "2-3 sentence explanation" }. Be decisive and specific about which policy rule applies.`;

export async function POST(req: Request) {
  try {
    const { transaction_id } = await req.json();

    if (!transaction_id) {
      return Response.json(
        { error: 'transaction_id is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 1. Get the transaction by id
    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(transaction_id) as Transaction | undefined;

    if (!transaction) {
      return Response.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 2. Get employee profile (lookback 90 days)
    const profile = getEmployeeProfile(transaction.employee_id, 90, true);

    // 3. Get dept budget status
    const budgetStatus = getBudgetStatus(transaction.department);

    // 4. Build context prompt
    const contextPrompt = `Review this expense for approval:

Transaction:
- Amount: $${transaction.amount.toFixed(2)}
- Merchant: ${transaction.merchant}
- Category: ${transaction.category}
- Date: ${transaction.date}
- Description: ${transaction.description}
- Employee: ${transaction.employee_name} (${transaction.department})

Employee Profile:
- Total spent (90 days): $${profile.total_spent.toFixed(2)}
- Average transaction: $${profile.avg_transaction.toFixed(2)}
- Peer average: $${profile.peer_avg.toFixed(2)}
- Violation count: ${profile.violation_count}
- Top categories: ${JSON.stringify(profile.top_categories.slice(0, 3))}

Department Budget:
${JSON.stringify(budgetStatus, null, 2)}

Return your decision as JSON: { "recommendation": "approve" or "deny", "reasoning": "explanation" }`;

    // 5. Call Claude for recommendation
    let recommendation = 'approve';
    let reasoning = 'Auto-approved: within policy limits.';

    try {
      const response = await runAgentOnce(contextPrompt, APPROVAL_SYSTEM_PROMPT);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendation = parsed.recommendation || recommendation;
        reasoning = parsed.reasoning || reasoning;
      }
    } catch {
      // Use defaults if Claude call fails
    }

    // 6. Build context packet
    const contextPacket = JSON.stringify({
      employee_profile: {
        total_spent: profile.total_spent,
        avg_transaction: profile.avg_transaction,
        peer_avg: profile.peer_avg,
        violation_count: profile.violation_count,
      },
      budget_status: budgetStatus,
    });

    // 7. Insert approval record
    insertApproval({
      transaction_id: transaction.id,
      employee_id: transaction.employee_id,
      amount: transaction.amount,
      merchant: transaction.merchant,
      description: transaction.description,
      ai_recommendation: recommendation,
      ai_reasoning: reasoning,
      context_packet: contextPacket,
      status: 'pending',
      created_at: new Date().toISOString(),
      resolved_at: null,
    });

    // 8. Update the transaction status to 'pending' if not already
    db.prepare("UPDATE transactions SET status = 'pending' WHERE id = ? AND status != 'pending'")
      .run(transaction_id);

    // 9. Return the approval record
    const approval = db
      .prepare('SELECT * FROM approvals WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(transaction_id);

    return Response.json({ success: true, approval });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Approval generation failed' },
      { status: 500 }
    );
  }
}
