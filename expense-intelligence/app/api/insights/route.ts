import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const db = getDb();

    // ── 1. Vendor Consolidation ──────────────────────────────────────────────
    // Find categories where multiple merchants are used; estimate 12% savings
    const vendorRows = db.prepare(`
      SELECT
        category,
        COUNT(DISTINCT merchant) as vendor_count,
        ROUND(SUM(amount), 2)    as total_spend,
        ROUND(AVG(amount), 2)    as avg_tx,
        COUNT(*)                 as tx_count,
        GROUP_CONCAT(DISTINCT merchant) as vendors_raw
      FROM transactions
      GROUP BY category
      HAVING vendor_count > 1
      ORDER BY total_spend DESC
      LIMIT 6
    `).all() as Array<{
      category: string;
      vendor_count: number;
      total_spend: number;
      avg_tx: number;
      tx_count: number;
      vendors_raw: string;
    }>;

    const vendor_consolidation = vendorRows.map(r => ({
      category: r.category,
      vendor_count: r.vendor_count,
      total_spend: r.total_spend,
      tx_count: r.tx_count,
      vendors: r.vendors_raw ? r.vendors_raw.split(',').slice(0, 6) : [],
      potential_savings: Math.round(r.total_spend * 0.12 * 100) / 100,
    }));

    // ── 2. Department Spend Summary ──────────────────────────────────────────
    const deptSpendRows = db.prepare(`
      SELECT
        department,
        ROUND(SUM(amount), 2) as total_spend,
        COUNT(*) as tx_count,
        ROUND(AVG(amount), 2) as avg_tx,
        COUNT(DISTINCT employee_id) as employee_count
      FROM transactions
      GROUP BY department
      ORDER BY total_spend DESC
    `).all() as Array<{ department: string; total_spend: number; tx_count: number; avg_tx: number; employee_count: number }>;

    const totalAllDepts = deptSpendRows.reduce((s, r) => s + r.total_spend, 0);
    const budget_forecast = deptSpendRows.map(r => ({
      department: r.department,
      total_spend: r.total_spend,
      tx_count: r.tx_count,
      avg_tx: r.avg_tx,
      employee_count: r.employee_count,
      pct_of_total: totalAllDepts > 0 ? Math.round((r.total_spend / totalAllDepts) * 100) : 0,
    }));

    // ── 3. Peer Benchmarking ─────────────────────────────────────────────────
    const empSpend = db.prepare(`
      SELECT
        employee_id,
        employee_name as name,
        department,
        ROUND(SUM(amount), 2)  as total_spend,
        COUNT(*)               as tx_count,
        ROUND(AVG(amount), 2)  as avg_tx
      FROM transactions
      GROUP BY employee_id
      ORDER BY total_spend DESC
    `).all() as Array<{
      employee_id: string;
      name: string;
      department: string;
      total_spend: number;
      tx_count: number;
      avg_tx: number;
    }>;

    // Compute dept averages
    const deptTotals: Record<string, { sum: number; count: number }> = {};
    for (const e of empSpend) {
      if (!deptTotals[e.department]) deptTotals[e.department] = { sum: 0, count: 0 };
      deptTotals[e.department].sum += e.total_spend;
      deptTotals[e.department].count += 1;
    }

    const peer_benchmarking = empSpend.map(e => {
      const dept = deptTotals[e.department];
      const dept_avg = dept ? Math.round((dept.sum / dept.count) * 100) / 100 : 0;
      const pct_vs_avg = dept_avg > 0
        ? Math.round(((e.total_spend - dept_avg) / dept_avg) * 100)
        : 0;
      const status: 'high' | 'normal' | 'low' =
        pct_vs_avg > 30 ? 'high' : pct_vs_avg < -30 ? 'low' : 'normal';

      return {
        employee_id: e.employee_id,
        name: e.name,
        department: e.department,
        total_spend: e.total_spend,
        tx_count: e.tx_count,
        avg_tx: e.avg_tx,
        dept_avg,
        pct_vs_avg,
        status,
      };
    });

    return Response.json({ vendor_consolidation, budget_forecast, peer_benchmarking });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to load insights' },
      { status: 500 }
    );
  }
}
