import { NextRequest, NextResponse } from 'next/server';
import { handleToolCall } from '@/lib/claude/tool-handlers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, merchant, category, attendee_count } = body;

    if (!amount || !merchant || !category) {
      return NextResponse.json(
        { error: 'amount, merchant, and category are required' },
        { status: 400 }
      );
    }

    const result = handleToolCall('check_compliance', {
      amount,
      merchant,
      category,
      attendee_count: attendee_count ?? 1,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Compliance check failed' },
      { status: 500 }
    );
  }
}
