import { getDb } from '@/lib/db';
import { getBudgetStatus } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

function getQuarterStart(period: string): Date {
  const [y, qStr] = period.split('-Q');
  const q = parseInt(qStr, 10);
  return new Date(parseInt(y, 10), (q - 1) * 3, 1);
}

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

    // ── 2. Budget Forecasting ────────────────────────────────────────────────
    const period = getCurrentQuarter();
    const allBudgets = getBudgetStatus(undefined, period);
    const totalBudgets = allBudgets.filter(b => b.category === 'total');

    // Days elapsed in quarter
    const qStart = getQuarterStart(period);
    const now = new Date();
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - qStart.getTime()) / 86400000));
    const burnRatePerDay = (dept: typeof totalBudgets[0]) =>
      dept.spent > 0 ? dept.spent / daysElapsed : 0;

    const budget_forecast = totalBudgets.map(b => {
      const rate = burnRatePerDay(b);
      const daysToExhaustion = rate > 0 ? Math.floor((b.allocated - b.spent) / rate) : Infinity;
      const exhaustionDate = rate > 0
        ? new Date(now.getTime() + daysToExhaustion * 86400000).toISOString().split('T')[0]
        : null;
      const overrunAmount = Math.max(0, b.projected_end_of_period - b.allocated);
      const status: 'over_budget' | 'at_risk' | 'on_track' =
        b.percent_used >= 100 ? 'over_budget'
        : overrunAmount > 0 || b.percent_used >= 80 ? 'at_risk'
        : 'on_track';

      return {
        department: b.department,
        period: b.period,
        allocated: b.allocated,
        spent: b.spent,
        percent_used: b.percent_used,
        projected_end: b.projected_end_of_period,
        overrun_amount: overrunAmount,
        days_until_overrun: daysToExhaustion === Infinity ? null : daysToExhaustion,
        overrun_date: daysToExhaustion <= 0 ? 'overrun now' : exhaustionDate,
        status,
      };
    }).sort((a, b) => b.percent_used - a.percent_used);

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
