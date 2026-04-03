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
    const result = db
      .prepare('UPDATE expense_reports SET cfo_approved = @cfo_approved WHERE id = @id')
      .run({ id, cfo_approved });

    if (result.changes === 0) {
      return Response.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const updated = db
      .prepare('SELECT * FROM expense_reports WHERE id = ?')
      .get(id);

    return Response.json({ success: true, report: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update report' },
      { status: 500 }
    );
  }
}
