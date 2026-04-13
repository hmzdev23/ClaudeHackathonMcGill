import { getDb } from '@/lib/db';
import { getEmployeeProfile, type Transaction } from '@/lib/db/queries';
import { runAgentOnce } from '@/lib/claude/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ApprovalRow {
  id: string;
  transaction_id: string;
  employee_id: string;
  amount: number;
  merchant: string;
  description: string;
  status: string;
}

const APPROVAL_SYSTEM_PROMPT = `You are an AI expense approval advisor for Brim Demo Corp.
Analyze the transaction and employee context, then return a JSON object with exactly two fields:
- "recommendation": either "approve" or "deny" (lowercase)
- "reasoning": a 1-2 sentence explanation citing specific data points (amount vs limit, violation history, budget status)

Respond with ONLY valid JSON, no markdown, no extra text.

Company policy highlights:
- Approval threshold: $50 — all expenses $50+ require pre-authorization and receipts
- Meal limits: $75 solo, $150/person team; tips max 20%
- Flight: $800 | Hotel: $250/night | Software: $500 | Conference: $1,500 | Equipment: $1,000 | Entertainment: $200
- Alcohol: NOT permitted unless dining with a customer
- Restricted merchants: casinos, gambling, adult entertainment, lottery
- Corporate cards: business use only, named cardholder only`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const approvalId: string | undefined = body.id;
    const txnId: string | undefined = body.transaction_id;

    if (!approvalId && !txnId) {
      return Response.json({ error: 'id or transaction_id is required' }, { status: 400 });
    }

    const db = getDb();

    const approval = approvalId
      ? (db.prepare('SELECT * FROM approvals WHERE id = ?').get(approvalId) as ApprovalRow | undefined)
      : (db.prepare('SELECT * FROM approvals WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1').get(txnId) as ApprovalRow | undefined);

    if (!approval) {
      return Response.json({ error: 'Approval not found' }, { status: 404 });
    }

    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(approval.transaction_id) as Transaction | undefined;

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const profile = getEmployeeProfile(transaction.employee_id, 90, true);

    const prompt = `Transaction requiring approval:
- Employee: ${transaction.employee_name} (${transaction.department})
- Amount: $${transaction.amount.toFixed(2)}
- Merchant: ${transaction.merchant}
- Category: ${transaction.category}
- Description: ${transaction.description}
- Date: ${transaction.date}

Employee context (last 90 days):
- Total spend: $${profile.total_spent.toFixed(2)} across ${profile.transactions.length} transactions
- Average transaction: $${profile.avg_transaction.toFixed(2)}
- Policy violations: ${profile.violation_count}
- Top categories: ${profile.top_categories.slice(0, 3).map(c => `${c.category} ($${c.total.toFixed(0)})`).join(', ')}
- Peer average spend: $${profile.peer_avg.toFixed(2)}

Should this expense be approved or denied?`;

    const raw = await runAgentOnce(prompt, APPROVAL_SYSTEM_PROMPT, false);

    let recommendation = 'approve';
    let reasoning = raw.trim();

    try {
      // Strip any markdown code fences if present
      const cleaned = raw.replace(/^```[a-z]*\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.recommendation && ['approve', 'deny'].includes(parsed.recommendation)) {
        recommendation = parsed.recommendation;
      }
      if (parsed.reasoning) reasoning = parsed.reasoning;
    } catch {
      // Claude didn't return JSON — try to extract from text
      if (raw.toLowerCase().includes('deny') && !raw.toLowerCase().includes('approve')) {
        recommendation = 'deny';
      }
      // Keep raw text as reasoning
    }

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
