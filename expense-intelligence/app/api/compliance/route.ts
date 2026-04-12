import { NextRequest, NextResponse } from 'next/server';
import { handleToolCall } from '@/lib/claude/tool-handlers';
import { getDemoComplianceAnalysis } from '@/lib/claude/demo-agent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, merchant, category, attendee_count = 1 } = body;

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

    // 2. Demo AI analysis (instant, no API cost)
    const ai_analysis = getDemoComplianceAnalysis(ruleResult.issues.length > 0, amount, merchant, category);

    return NextResponse.json({ ...ruleResult, ai_analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Compliance check failed' },
      { status: 500 }
    );
  }
}
