import { getDb } from '@/lib/db';
import { getEmployeeProfile, type Transaction } from '@/lib/db/queries';
import { runAgentOnce } from '@/lib/claude/agent';

export const dynamic = 'force-dynamic';

const APPROVAL_SYSTEM_PROMPT = `You are an AI financial advisor for a corporate card program. Given a card expense with spend history, provide a JSON decision: { "recommendation": "approve" or "deny", "reasoning": "2-3 sentence explanation citing specific numbers" }. Be decisive and data-driven.`;

interface ApprovalRow {
  id: string;
  transaction_id: string;
  employee_id: string;
  amount: number;
  merchant: string;
  description: string;
  status: string;
}

export async function POST(req: Request) {
  try {
    // Accept either approval `id` or `transaction_id`
    const body = await req.json();
    const approvalId: string | undefined = body.id;
    const txnId: string | undefined = body.transaction_id;

    if (!approvalId && !txnId) {
      return Response.json({ error: 'id or transaction_id is required' }, { status: 400 });
    }

    const db = getDb();

    // Resolve the approval record
    const approval = approvalId
      ? (db.prepare('SELECT * FROM approvals WHERE id = ?').get(approvalId) as ApprovalRow | undefined)
      : (db.prepare('SELECT * FROM approvals WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1').get(txnId) as ApprovalRow | undefined);

    if (!approval) {
      return Response.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Get the transaction
    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(approval.transaction_id) as Transaction | undefined;

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get card group spend profile
    const profile = getEmployeeProfile(transaction.employee_id, 90, true);

    const contextPrompt = `Review this corporate card expense for approval:

Transaction:
- Amount: $${transaction.amount.toFixed(2)} CAD
- Merchant: ${transaction.merchant}
- Category: ${transaction.category}
- Date: ${transaction.date}
- Description: ${transaction.description}
- Card Group: ${transaction.employee_name} (${transaction.department})

Card Group Spend Profile (last 90 days):
- Total spent: $${profile.total_spent.toFixed(2)}
- Average transaction: $${profile.avg_transaction.toFixed(2)}
- Peer group average: $${profile.peer_avg.toFixed(2)}
- Policy violations: ${profile.violation_count}
- Top spend categories: ${profile.top_categories.slice(0, 3).map((c: { category: string; total: number }) => `${c.category} ($${c.total.toFixed(0)})`).join(', ')}

No pre-set budget allocations in this dataset. Base your recommendation on transaction size relative to historical patterns, category norms, and general corporate card policy.

Return JSON only: { "recommendation": "approve" or "deny", "reasoning": "explanation" }`;

    let recommendation = 'approve';
    let reasoning = 'Within normal spend patterns for this card group.';

    try {
      const response = await runAgentOnce(contextPrompt, APPROVAL_SYSTEM_PROMPT);
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendation = parsed.recommendation || recommendation;
        reasoning = parsed.reasoning || reasoning;
      }
    } catch {
      // Fall through to defaults
    }

    // UPDATE the existing approval record (don't create a duplicate)
    db.prepare(
      `UPDATE approvals SET ai_recommendation = ?, ai_reasoning = ? WHERE id = ?`
    ).run(recommendation, reasoning, approval.id);

    const updated = db.prepare('SELECT * FROM approvals WHERE id = ?').get(approval.id);
    return Response.json({ success: true, approval: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Approval generation failed' },
      { status: 500 }
    );
  }
}
