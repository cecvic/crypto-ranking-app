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

// Schedule names for our cron jobs
export const SCHEDULE_NAMES = {
  COLLECT_PRICES: 'collect-prices',
  COLLECT_SENTIMENT: 'collect-sentiment',
  COMPUTE_RANKINGS: 'compute-rankings',
  CLEANUP: 'cleanup',
} as const;

// Cron schedules
export const CRON_SCHEDULES = {
  [SCHEDULE_NAMES.COLLECT_PRICES]: '* * * * *',        // Every minute
  [SCHEDULE_NAMES.COLLECT_SENTIMENT]: '*/15 * * * *',  // Every 15 minutes
  [SCHEDULE_NAMES.COMPUTE_RANKINGS]: '*/5 * * * *',    // Every 5 minutes
  [SCHEDULE_NAMES.CLEANUP]: '0 3 * * *',               // Daily at 3 AM
} as const;

// Helper to get the base URL for cron endpoints
export function getCronBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL or VERCEL_URL must be set');
  }
  // Ensure https in production
  if (baseUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
    return baseUrl.replace('http://', 'https://');
  }
  if (!baseUrl.startsWith('http')) {
    return `https://${baseUrl}`;
  }
  return baseUrl;
}

// Setup all cron schedules (run once during deployment)
export async function setupCronSchedules(): Promise<void> {
  const client = getQStashClient();
  const baseUrl = getCronBaseUrl();

  const schedules = [
    { name: SCHEDULE_NAMES.COLLECT_PRICES, path: '/api/cron/collect-prices' },
    { name: SCHEDULE_NAMES.COLLECT_SENTIMENT, path: '/api/cron/collect-sentiment' },
    { name: SCHEDULE_NAMES.COMPUTE_RANKINGS, path: '/api/cron/compute-rankings' },
    { name: SCHEDULE_NAMES.CLEANUP, path: '/api/cron/cleanup' },
  ];

  for (const schedule of schedules) {
    try {
      await client.schedules.create({
        destination: `${baseUrl}${schedule.path}`,
        cron: CRON_SCHEDULES[schedule.name as keyof typeof CRON_SCHEDULES],
        retries: 3,
      });
      console.log(`Created schedule: ${schedule.name}`);
    } catch (error) {
      // Schedule might already exist
      console.log(`Schedule ${schedule.name} may already exist:`, error);
    }
  }
}
