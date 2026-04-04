import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employee_id = searchParams.get('employee_id');

  const db = getDb();

  const query = employee_id
    ? `SELECT DISTINCT event_tag, COUNT(*) as txn_count, SUM(amount) as total
       FROM transactions
       WHERE event_tag IS NOT NULL AND event_tag != '' AND employee_id = ?
       GROUP BY event_tag
       ORDER BY event_tag DESC`
    : `SELECT DISTINCT event_tag, COUNT(*) as txn_count, SUM(amount) as total
       FROM transactions
       WHERE event_tag IS NOT NULL AND event_tag != ''
       GROUP BY event_tag
       ORDER BY event_tag DESC`;

  const rows = (employee_id
    ? db.prepare(query).all(employee_id)
    : db.prepare(query).all()) as Array<{ event_tag: string; txn_count: number; total: number }>;

  return Response.json({ event_tags: rows });
}
