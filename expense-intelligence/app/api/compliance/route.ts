import { NextRequest, NextResponse } from 'next/server';
import { handleToolCall } from '@/lib/claude/tool-handlers';
import { runAgentOnce } from '@/lib/claude/agent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, merchant, category, attendee_count = 1, use_alt_model = false } = body;

    if (!amount || !merchant || !category) {
      return NextResponse.json(
        { error: 'amount, merchant, and category are required' },
        { status: 400 }
      );
    }

    // 1. Deterministic rule check (fast)
    const ruleResult = handleToolCall('check_compliance', {
      amount,
      merchant,
      category,
      attendee_count,
    }) as {
      compliant: boolean;
      requires_approval: boolean;
      issues: Array<{ rule: string; severity: string; detail: string }>;
      policy_summary: { approval_threshold: number; applied_limit: number | null };
    };

    // 2. Claude contextual analysis — adds nuance the rule engine can't
    let ai_analysis = '';
    try {
      const violationText = ruleResult.issues.length > 0
        ? `Rule violations found:\n${ruleResult.issues.map(i => `- [${i.severity.toUpperCase()}] ${i.rule}: ${i.detail}`).join('\n')}`
        : 'No rule violations detected.';

      const prompt = `Evaluate this business expense and give a concise 2-3 sentence analysis.

Transaction: $${amount} at "${merchant}" (${category}, ${attendee_count} attendee${attendee_count !== 1 ? 's' : ''})
${violationText}
Approval threshold: $${ruleResult.policy_summary.approval_threshold}
${ruleResult.policy_summary.applied_limit ? `Category limit: $${ruleResult.policy_summary.applied_limit}` : ''}

Your analysis should:
1. Confirm whether this is compliant or explain the specific violation in plain language
2. Note any relevant business context (e.g. team size, merchant type, category norms)
3. Give a clear recommendation to the finance manager

Be direct. Reference specific dollar amounts and thresholds.`;

      ai_analysis = await runAgentOnce(prompt, 'You are a finance compliance expert. Be concise and specific.', false, use_alt_model);
    } catch {
      // Non-fatal — rule result is still returned
      ai_analysis = '';
    }

    return NextResponse.json({ ...ruleResult, ai_analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Compliance check failed' },
      { status: 500 }
    );
  }
}
