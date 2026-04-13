import { getDb } from '@/lib/db';
import { updateApprovalStatus, updateBudgetSpent, type Approval } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!status || !['approved', 'denied'].includes(status)) {
      return Response.json(
        { error: 'status must be either approved or denied' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 1. Update the approval status (silently skips on read-only FS like Vercel)
    try {
      updateApprovalStatus(id, status);
    } catch {
      // Read-only filesystem — optimistic UI on client handles the visual update
    }

    // 2. Get the updated approval record
    const approval = db
      .prepare('SELECT * FROM approvals WHERE id = ?')
      .get(id) as Approval | undefined;

    if (!approval) {
      return Response.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    // 3 & 4. Update budget and transaction status — silently skip if read-only FS
    try {
      if (status === 'approved') {
        const transaction = db
          .prepare('SELECT * FROM transactions WHERE id = ?')
          .get(approval.transaction_id) as { department: string; amount: number } | undefined;
        if (transaction) {
          const now = new Date();
          const q = Math.ceil((now.getMonth() + 1) / 3);
          updateBudgetSpent(transaction.department, `${now.getFullYear()}-Q${q}`, transaction.amount);
        }
      }
      const newTxnStatus = status === 'approved' ? 'approved' : 'denied';
      db.prepare('UPDATE transactions SET status = @status WHERE id = @transaction_id')
        .run({ status: newTxnStatus, transaction_id: approval.transaction_id });
    } catch {
      // Read-only filesystem
    }

    // 5. Return the updated approval (merged with requested status for read-only FS)
    const updated = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) ?? { ...approval, status };
    return Response.json({ success: true, approval: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Approval update failed' },
      { status: 500 }
    );
  }
}
