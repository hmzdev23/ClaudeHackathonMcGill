import { getDb } from '@/lib/db';
import { updateApprovalStatus } from '@/lib/db/queries';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let sql = `
      SELECT a.*, e.name as employee_name, e.department
      FROM approvals a
      LEFT JOIN employees e ON e.id = a.employee_id
    `;
    const params: Record<string, string> = {};

    if (status) {
      sql += ' WHERE a.status = @status';
      params.status = status;
    }

    sql += ' ORDER BY a.created_at DESC';

    const approvals = db.prepare(sql).all(params);

    return Response.json({ approvals });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load approvals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id, action } = await request.json();
    if (!id || !action || !['approved', 'denied'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    updateApprovalStatus(id, action as 'approved' | 'denied');
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
