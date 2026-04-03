import { getBudgetStatus } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const budgets = getBudgetStatus();

    // Calculate forecast and alerts
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const currentQuarter = `${now.getFullYear()}-Q${q}`;

    // Calculate remaining weeks in the quarter
    const quarterEndMonth = q * 3;
    const quarterEnd = new Date(now.getFullYear(), quarterEndMonth, 0); // last day of quarter
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksRemaining = Math.max(0, Math.round((quarterEnd.getTime() - now.getTime()) / msPerWeek));

    const alerts: string[] = [];

    for (const budget of budgets) {
      // Check if projected end-of-period exceeds allocated or percent_used > 80
      if (budget.projected_end_of_period > budget.allocated || budget.percent_used > 80) {
        const spent = budget.spent.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const allocated = budget.allocated.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
        alerts.push(
          `${budget.department} has used ${Math.round(budget.percent_used)}% of ${currentQuarter.replace('-', ' ')} budget (${spent}/${allocated}) with ${weeksRemaining} weeks remaining.`
        );
      }
    }

    return Response.json({ budgets, alerts });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load budget status' },
      { status: 500 }
    );
  }
}
