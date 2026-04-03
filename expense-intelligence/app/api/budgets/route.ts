import { NextResponse } from 'next/server';
import { getBudgetStatus } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const budgets = getBudgetStatus();
    return NextResponse.json({ budgets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load budgets' },
      { status: 500 }
    );
  }
}
