import { getDb } from '@/lib/db';
import {
  getTransactionsForReport,
  insertExpenseReport,
  type ExpenseReport,
} from '@/lib/db/queries';
import { runAgentOnce } from '@/lib/claude/agent';
import { REPORT_GENERATION_PROMPT } from '@/lib/claude/prompts';
import { POLICY } from '@/lib/policy/rules';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const reports = db
      .prepare('SELECT * FROM expense_reports ORDER BY generated_at DESC')
      .all() as ExpenseReport[];

    return Response.json({ reports });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load reports' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { employee_id, event_tag } = await req.json();

    if (!employee_id) {
      return Response.json(
        { error: 'employee_id is required' },
        { status: 400 }
      );
    }

    // 1. Get transactions for report
    const transactions = getTransactionsForReport(employee_id, event_tag);

    if (transactions.length === 0) {
      return Response.json(
        { error: 'No matching transactions found' },
        { status: 404 }
      );
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    // 2. Build prompt with transaction list + policy limits
    const prompt = `Generate a structured expense report for the following transactions. Return JSON with: { "title": string, "narrative": string, "line_items": Array<{ description: string, amount: number, category: string, date: string }>, "total": number, "policy_summary": string }

Employee: ${transactions[0].employee_name} (${transactions[0].department})
Event: ${event_tag || 'General expenses'}
Total: $${totalAmount.toFixed(2)}

Policy limits:
${JSON.stringify(POLICY.category_limits, null, 2)}

Transactions:
${JSON.stringify(transactions, null, 2)}

Return ONLY the JSON object, no other text.`;

    // 3. Call Claude for report generation
    let title = `Expense Report - ${event_tag || 'General'}`;
    let narrative = '';
    let lineItems: Array<{ description: string; amount: number; category: string; date: string }> = [];
    let policySummary = 'No policy issues detected.';

    try {
      const response = await runAgentOnce(prompt, REPORT_GENERATION_PROMPT);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        title = parsed.title || title;
        narrative = parsed.narrative || '';
        lineItems = parsed.line_items || [];
        policySummary = parsed.policy_summary || policySummary;
      }
    } catch {
      // Use defaults if Claude call fails
      narrative = `Expense report for ${transactions[0].employee_name} covering ${transactions.length} transactions totaling $${totalAmount.toFixed(2)}.`;
      lineItems = transactions.map((t) => ({
        description: `${t.merchant} - ${t.description}`,
        amount: t.amount,
        category: t.category,
        date: t.date,
      }));
    }

    // 5. Insert expense report
    const reportId = insertExpenseReport({
      title,
      employee_id,
      employee_name: transactions[0].employee_name,
      event_tag: event_tag || null,
      transaction_ids: JSON.stringify(transactions.map((t) => t.id)),
      total_amount: Math.round(totalAmount * 100) / 100,
      policy_status: policySummary,
      narrative,
      generated_at: new Date().toISOString(),
      cfo_approved: 0,
    });

    // 6. Return the report
    return Response.json({
      success: true,
      report: {
        id: reportId,
        title,
        employee_id,
        employee_name: transactions[0].employee_name,
        event_tag: event_tag || null,
        total_amount: Math.round(totalAmount * 100) / 100,
        narrative,
        line_items: lineItems,
        policy_summary: policySummary,
        transaction_count: transactions.length,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Report generation failed' },
      { status: 500 }
    );
  }
}
