import { getDb } from '@/lib/db';
import { getEmployeeProfile, type Transaction } from '@/lib/db/queries';
import { getDemoApprovalRecommendation } from '@/lib/claude/demo-agent';

export const dynamic = 'force-dynamic';


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

    const { recommendation, reasoning } = getDemoApprovalRecommendation(
      transaction.amount,
      transaction.merchant,
      transaction.category,
      profile.violation_count
    );

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
