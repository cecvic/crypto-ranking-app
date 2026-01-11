import { NextResponse } from 'next/server';
import { checkRedisConnection } from '@/lib/cache/redis';
import { checkConnection } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
    coingecko: boolean;
  };
  version: string;
  uptime: number;
}

const startTime = Date.now();

export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkCoinGeckoHealth(),
  ]);

  const databaseOk = checks[0].status === 'fulfilled' && checks[0].value;
  const redisOk = checks[1].status === 'fulfilled' && checks[1].value;
  const coingeckoOk = checks[2].status === 'fulfilled' && checks[2].value;

  // Determine overall status
  let status: HealthCheck['status'];
  if (databaseOk && redisOk && coingeckoOk) {
    status = 'healthy';
  } else if (!databaseOk && !redisOk) {
    status = 'unhealthy'; // Both cache layers down
  } else {
    status = 'degraded'; // Some services unavailable
  }

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: databaseOk,
      redis: redisOk,
      coingecko: coingeckoOk,
    },
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  return NextResponse.json(health, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    return await checkConnection();
  } catch {
    return false;
  }
}

async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return false;
    }
    return await checkRedisConnection();
  } catch {
    return false;
  }
}

async function checkCoinGeckoHealth(): Promise<boolean> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/ping', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
