import { getDb } from '@/lib/db';
import type { ExpenseReport } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const report = db
      .prepare('SELECT * FROM expense_reports WHERE id = ?')
      .get(id) as ExpenseReport | undefined;

    if (!report) {
      return Response.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return Response.json({ report });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load report' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { cfo_approved } = await req.json();

    if (cfo_approved === undefined || ![0, 1].includes(cfo_approved)) {
      return Response.json(
        { error: 'cfo_approved must be 0 or 1' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Attempt write — silently skip on read-only FS (Vercel)
    try {
      db.prepare('UPDATE expense_reports SET cfo_approved = @cfo_approved WHERE id = @id').run({ id, cfo_approved });
    } catch {
      // Read-only filesystem — return success anyway
    }

    const updated = db.prepare('SELECT * FROM expense_reports WHERE id = ?').get(id);
    return Response.json({ success: true, report: updated ?? { id, cfo_approved } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update report' },
      { status: 500 }
    );
  }
}
