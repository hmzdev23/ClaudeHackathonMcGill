import { getDashboardKpis, getViolationsSummary, getBudgetStatus, getMonthlySpend, getCategorySpend, getDepartmentSpend } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const kpis = getDashboardKpis();
    const { violations: recent_violations } = getViolationsSummary({ status: 'open' });
    const budget_status = getBudgetStatus();
    const monthly_spend = getMonthlySpend();
    const category_spend = getCategorySpend();
    const department_spend = getDepartmentSpend();

    return Response.json({
      kpis,
      recent_violations: recent_violations.slice(0, 5),
      budget_status,
      monthly_spend,
      category_spend,
      department_spend,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
