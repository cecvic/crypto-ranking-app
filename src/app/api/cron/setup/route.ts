import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  setupCronSchedules,
  removeAllSchedules,
  listSchedules,
  QSTASH_SCHEDULES,
} from '@/lib/qstash/client';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean slate: remove old schedules, then create fresh ones
    const removed = await removeAllSchedules();
    const { created, errors } = await setupCronSchedules();

    return NextResponse.json({
      success: errors.length === 0,
      removed,
      created,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron-setup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to setup schedules' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const active = await listSchedules();

    return NextResponse.json({
      configured: QSTASH_SCHEDULES.map((s) => ({
        name: s.name,
        path: s.path,
        cron: s.cron,
      })),
      active,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron-setup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list schedules' },
      { status: 500 },
    );
  }
}
