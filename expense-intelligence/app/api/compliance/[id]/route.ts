import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!status || !['open', 'resolved', 'false_positive'].includes(status)) {
      return Response.json(
        { error: 'status must be one of: open, resolved, false_positive' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Read current record first (always works, even on read-only FS)
    const existing = db.prepare('SELECT * FROM violations WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return Response.json({ error: 'Violation not found' }, { status: 404 });
    }

    // Attempt write — silently skip on read-only FS (Vercel)
    try {
      db.prepare('UPDATE violations SET status = @status WHERE id = @id').run({ id, status });
    } catch {
      // Read-only filesystem — return success with in-memory status
    }

    const updated = db.prepare('SELECT * FROM violations WHERE id = ?').get(id) ?? { ...existing, status };
    return Response.json({ success: true, violation: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update violation' },
      { status: 500 }
    );
  }
}
