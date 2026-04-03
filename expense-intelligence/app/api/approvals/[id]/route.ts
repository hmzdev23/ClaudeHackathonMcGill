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

    // 1. Update the approval status
    updateApprovalStatus(id, status);

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

    // 3. If approved, update the budget spent for the department
    if (status === 'approved') {
      // Get the transaction to find the department
      const transaction = db
        .prepare('SELECT * FROM transactions WHERE id = ?')
        .get(approval.transaction_id) as { department: string; amount: number } | undefined;

      if (transaction) {
        const now = new Date();
        const q = Math.ceil((now.getMonth() + 1) / 3);
        const period = `${now.getFullYear()}-Q${q}`;

        updateBudgetSpent(transaction.department, period, transaction.amount);
      }
    }

    // 4. Update the linked transaction status
    const newTxnStatus = status === 'approved' ? 'approved' : 'denied';
    db.prepare('UPDATE transactions SET status = @status WHERE id = @transaction_id')
      .run({ status: newTxnStatus, transaction_id: approval.transaction_id });

    // 5. Return the updated approval
    const updated = db
      .prepare('SELECT * FROM approvals WHERE id = ?')
      .get(id);

    return Response.json({ success: true, approval: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Approval update failed' },
      { status: 500 }
    );
  }
}
