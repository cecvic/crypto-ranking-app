// QStash Client for Background Job Scheduling
import { Client } from '@upstash/qstash';

// Lazy-loaded client to avoid build-time errors
let _client: Client | null = null;

export function getQStashClient(): Client {
  if (!_client) {
    if (!process.env.QSTASH_TOKEN) {
      throw new Error('QSTASH_TOKEN environment variable is not set');
    }
    _client = new Client({
      token: process.env.QSTASH_TOKEN,
    });
  }
  return _client;
}

// All cron schedules managed via QStash
export const QSTASH_SCHEDULES = [
  { name: 'collect-prices',     path: '/api/cron/collect-prices',     cron: '*/10 * * * *' },  // Every 10 min
  { name: 'collect-sentiment',  path: '/api/cron/collect-sentiment',  cron: '*/15 * * * *' },  // Every 15 min
  { name: 'compute-rankings',   path: '/api/cron/compute-rankings',   cron: '*/5 * * * *'  },  // Every 5 min
  { name: 'poll-birdeye',       path: '/api/cron/poll-birdeye',       cron: '*/15 * * * *' },  // Every 15 min
  { name: 'cleanup',            path: '/api/cron/cleanup',            cron: '0 3 * * *'    },  // Daily 3 AM
] as const;

// Helper to get the base URL for cron endpoints
export function getCronBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL or VERCEL_URL must be set');
  }
  if (baseUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
    return baseUrl.replace('http://', 'https://');
  }
  if (!baseUrl.startsWith('http')) {
    return `https://${baseUrl}`;
  }
  return baseUrl;
}

// List existing QStash schedules
export async function listSchedules(): Promise<{ scheduleId: string; destination: string; cron: string }[]> {
  const client = getQStashClient();
  const schedules = await client.schedules.list();
  return schedules.map((s) => ({
    scheduleId: s.scheduleId,
    destination: typeof s.destination === 'string' ? s.destination : (s.destination as { url: string }).url,
    cron: s.cron ?? '',
  }));
}

// Remove all existing schedules (clean slate before re-registering)
export async function removeAllSchedules(): Promise<number> {
  const client = getQStashClient();
  const existing = await client.schedules.list();
  let removed = 0;
  for (const schedule of existing) {
    await client.schedules.delete(schedule.scheduleId);
    removed++;
  }
  return removed;
}

// Register all cron schedules with QStash
export async function setupCronSchedules(): Promise<{ created: string[]; errors: string[] }> {
  const client = getQStashClient();
  const baseUrl = getCronBaseUrl();
  const created: string[] = [];
  const errors: string[] = [];

  for (const schedule of QSTASH_SCHEDULES) {
    try {
      await client.schedules.create({
        destination: `${baseUrl}${schedule.path}`,
        cron: schedule.cron,
        retries: 3,
      });
      created.push(`${schedule.name} (${schedule.cron})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${schedule.name}: ${msg}`);
    }
  }

  return { created, errors };
}
