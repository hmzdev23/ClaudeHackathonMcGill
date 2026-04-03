import { seedDatabase } from '@/lib/db/seed';
import { seedBrimDatabase } from '@/lib/db/seed_brim';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = seedDatabase();
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode ?? 'synthetic';

    let result;
    if (mode === 'brim') {
      result = seedBrimDatabase();
    } else {
      result = seedDatabase();
    }

    return Response.json({ success: true, mode, ...result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 }
    );
  }
}
