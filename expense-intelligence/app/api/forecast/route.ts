import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface MonthDeptRow {
  month: string;
  department: string;
  total: number;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

function addMonths(yyyymm: string, n: number): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthsBetween(a: string, b: string): string[] {
  const result: string[] = [];
  let cur = a;
  while (cur <= b) {
    result.push(cur);
    cur = addMonths(cur, 1);
  }
  return result;
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m', date) as month, department, ROUND(SUM(amount), 2) as total
         FROM transactions
         GROUP BY month, department
         ORDER BY month`
      )
      .all() as MonthDeptRow[];

    if (rows.length === 0) {
      return Response.json({ error: 'No transaction data available' }, { status: 404 });
    }

    // Build pivot: month -> dept -> total
    const pivot: Record<string, Record<string, number>> = {};
    rows.forEach((r) => {
      pivot[r.month] = pivot[r.month] ?? {};
      pivot[r.month][r.department] = r.total;
    });

    const departments = [...new Set(rows.map((r) => r.department))].sort();
    const allHistMonths = [...new Set(rows.map((r) => r.month))].sort();
    const lastActualMonth = allHistMonths[allHistMonths.length - 1];

    // Use Sep 2025 – Feb 2026 (last 6 full months before the partial March) for regression
    const regressionMonths = allHistMonths.slice(-7, -1);

    // Regression per department
    const regr: Record<string, { slope: number; intercept: number }> = {};
    departments.forEach((dept) => {
      const values = regressionMonths.map((m) => pivot[m]?.[dept] ?? 0);
      regr[dept] = linearRegression(values);
    });

    // Project 3 months forward
    const projectedMonths = [1, 2, 3].map((i) => addMonths(lastActualMonth, i));
    const n = regressionMonths.length;

    const projectedValues: Record<string, Record<string, number>> = {};
    projectedMonths.forEach((m, i) => {
      projectedValues[m] = {};
      departments.forEach((dept) => {
        const { slope, intercept } = regr[dept];
        projectedValues[m][dept] = Math.max(0, Math.round(intercept + slope * (n + i)));
      });
    });

    // Build unified chart data
    // Historical months: set actual keys
    // Last historical month: set both actual and _proj keys (bridge)
    // Projected months: set _proj keys only
    const fullMonths = [...allHistMonths, ...projectedMonths];
    const chartData = fullMonths.map((month) => {
      const isProj = projectedMonths.includes(month);
      const isLast = month === lastActualMonth;
      const entry: Record<string, string | number | boolean> = { month };

      departments.forEach((dept) => {
        const key = dept.replace(/ /g, '_');
        if (!isProj) {
          entry[key] = pivot[month]?.[dept] ?? 0;
        }
        if (isLast || isProj) {
          const val = isProj
            ? projectedValues[month][dept]
            : (pivot[month]?.[dept] ?? 0);
          entry[`${key}_proj`] = val;
        }
      });

      return entry;
    });

    // Trend summaries for AI and UI cards
    const trendSummaries = departments.map((dept) => {
      const { slope, intercept } = regr[dept];
      const avg = regressionMonths.reduce((s, m) => s + (pivot[m]?.[dept] ?? 0), 0) / regressionMonths.length;
      const trendPct = avg > 0 ? (slope / avg) * 100 : 0;
      const trend = trendPct > 3 ? 'increasing' : trendPct < -3 ? 'decreasing' : 'stable';
      const q2Total = projectedMonths
        .slice(0, 3)
        .reduce((s, _, i) => s + Math.max(0, Math.round(intercept + slope * (n + i))), 0);
      const lastActual = pivot[lastActualMonth]?.[dept] ?? 0;
      return {
        dept,
        key: dept.replace(/ /g, '_'),
        avg: Math.round(avg),
        slope: Math.round(slope),
        trend,
        trend_pct: Math.round(trendPct),
        q2_projected: q2Total,
        last_actual: lastActual,
      };
    });

    // Forecast narrative from real computed data
    const topDept = [...trendSummaries].sort((a, b) => b.q2_projected - a.q2_projected)[0];
    const insights = topDept
      ? `${topDept.dept} dominates projected spend at an average of $${topDept.avg.toLocaleString()}/month, forecasting $${topDept.q2_projected.toLocaleString()} for Q2 2026. Trend analysis is based on ${regressionMonths.length} months of actual transaction data — monitor closely for any acceleration.`
      : 'Insufficient data for trend projection.';

    return Response.json({
      chart_data: chartData,
      departments,
      projected_months: projectedMonths,
      last_actual_month: lastActualMonth,
      trend_summaries: trendSummaries,
      regression_months: regressionMonths,
      insights,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Forecast failed' },
      { status: 500 }
    );
  }
}
