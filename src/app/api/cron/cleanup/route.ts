// Cron: Cleanup Old Data
// Schedule: Daily at 3 AM
// Purpose: Remove old snapshots and expired cache entries

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequestWithDevBypass } from '@/lib/qstash/verify';
import { cleanupOldSnapshots, cleanupExpiredCache } from '@/lib/db/queries';

// Retention periods (in days)
const SNAPSHOT_RETENTION_DAYS = 30;

async function handler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[cleanup] Starting cleanup job...');

  const results: Record<string, unknown> = {};

  // 1. Cleanup old snapshots (and cascade to coin_rankings)
  if (process.env.USE_PERSISTENT_STORAGE === 'true') {
    try {
      const deletedSnapshots = await cleanupOldSnapshots(SNAPSHOT_RETENTION_DAYS);
      results.deletedSnapshots = deletedSnapshots;
      console.log(`[cleanup] Deleted ${deletedSnapshots} old snapshots`);
    } catch (error) {
      console.error('[cleanup] Failed to cleanup snapshots:', error);
      results.snapshotError = error instanceof Error ? error.message : 'Unknown error';
    }

    // 2. Cleanup expired API cache entries
    try {
      const deletedCacheEntries = await cleanupExpiredCache();
      results.deletedCacheEntries = deletedCacheEntries;
      console.log(`[cleanup] Deleted ${deletedCacheEntries} expired cache entries`);
    } catch (error) {
      console.error('[cleanup] Failed to cleanup cache:', error);
      results.cacheError = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    results.message = 'Persistent storage disabled, skipping DB cleanup';
    console.log('[cleanup] Persistent storage disabled, skipping');
  }

  const duration = Date.now() - startTime;
  console.log(`[cleanup] Completed in ${duration}ms`);

  return NextResponse.json({
    success: true,
    ...results,
    retentionDays: SNAPSHOT_RETENTION_DAYS,
    durationMs: duration,
    timestamp: new Date().toISOString(),
  });
}

export const POST = verifyCronRequestWithDevBypass(handler);

// Also allow GET for local testing
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return handler(req);
}
