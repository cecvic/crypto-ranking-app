// Alert subscription database queries
import { eq, and, gt, sql, desc } from 'drizzle-orm';
import { getDb } from './client';
import {
  alertSubscriptions,
  alertHistory,
  AlertSubscription,
  NewAlertSubscription,
  AlertHistoryRow,
  NewAlertHistoryRow,
} from './schema';

// ============================================
// SUBSCRIPTION CRUD OPERATIONS
// ============================================

/**
 * Get all active alert subscriptions
 */
export async function getActiveSubscriptions(): Promise<AlertSubscription[]> {
  const db = getDb();
  return db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.isActive, true));
}

/**
 * Get a user's subscription by Clerk user ID
 */
export async function getSubscription(
  clerkUserId: string
): Promise<AlertSubscription | null> {
  const db = getDb();
  const results = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.clerkUserId, clerkUserId))
    .limit(1);

  return results[0] || null;
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  data: NewAlertSubscription
): Promise<AlertSubscription> {
  const db = getDb();
  const results = await db
    .insert(alertSubscriptions)
    .values(data)
    .returning();

  return results[0];
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  clerkUserId: string,
  data: Partial<Omit<NewAlertSubscription, 'clerkUserId' | 'email'>>
): Promise<AlertSubscription | null> {
  const db = getDb();
  const results = await db
    .update(alertSubscriptions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(alertSubscriptions.clerkUserId, clerkUserId))
    .returning();

  return results[0] || null;
}

/**
 * Delete (deactivate) a subscription
 */
export async function deleteSubscription(clerkUserId: string): Promise<void> {
  const db = getDb();
  await db
    .update(alertSubscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(alertSubscriptions.clerkUserId, clerkUserId));
}

/**
 * Permanently delete a subscription
 */
export async function hardDeleteSubscription(clerkUserId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(alertSubscriptions)
    .where(eq(alertSubscriptions.clerkUserId, clerkUserId));
}

// ============================================
// ALERT HISTORY & DEDUPLICATION
// ============================================

/**
 * Log a sent alert to history
 */
export async function logAlertSent(
  data: NewAlertHistoryRow
): Promise<AlertHistoryRow> {
  const db = getDb();
  const results = await db.insert(alertHistory).values(data).returning();
  return results[0];
}

/**
 * Check if an alert was sent recently (within X hours)
 */
export async function wasAlertSentRecently(
  subscriptionId: number,
  coinId: string,
  hours: number = 6
): Promise<boolean> {
  const db = getDb();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const results = await db
    .select({ count: sql<number>`count(*)` })
    .from(alertHistory)
    .where(
      and(
        eq(alertHistory.subscriptionId, subscriptionId),
        eq(alertHistory.coinId, coinId),
        gt(alertHistory.sentAt, cutoff)
      )
    );

  return (results[0]?.count || 0) > 0;
}

/**
 * Get recent alert history for a subscription
 */
export async function getAlertHistory(
  subscriptionId: number,
  limit: number = 50
): Promise<AlertHistoryRow[]> {
  const db = getDb();
  return db
    .select()
    .from(alertHistory)
    .where(eq(alertHistory.subscriptionId, subscriptionId))
    .orderBy(desc(alertHistory.sentAt))
    .limit(limit);
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Increment the alert counter for a subscription
 */
export async function incrementAlertCount(
  subscriptionId: number
): Promise<void> {
  const db = getDb();
  await db
    .update(alertSubscriptions)
    .set({
      alertsSentToday: sql`${alertSubscriptions.alertsSentToday} + 1`,
    })
    .where(eq(alertSubscriptions.id, subscriptionId));
}

/**
 * Check if subscription has remaining alerts for today
 */
export async function hasRemainingAlerts(
  subscription: AlertSubscription
): Promise<boolean> {
  // Check if we need to reset the daily counter
  const lastReset = subscription.lastAlertResetAt;
  const now = new Date();

  if (lastReset) {
    const resetDate = new Date(lastReset);
    // If last reset was on a different day, we have full quota
    if (resetDate.toDateString() !== now.toDateString()) {
      return true;
    }
  }

  return subscription.alertsSentToday < subscription.maxAlertsPerDay;
}

/**
 * Reset daily alert counters (called by cleanup cron)
 */
export async function resetDailyAlertCounts(): Promise<number> {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .update(alertSubscriptions)
    .set({
      alertsSentToday: 0,
      lastAlertResetAt: new Date(),
    })
    .where(
      and(
        eq(alertSubscriptions.isActive, true),
        gt(alertSubscriptions.alertsSentToday, 0)
      )
    )
    .returning({ id: alertSubscriptions.id });

  return result.length;
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Get subscriptions that should receive alerts for given coins
 * Filters by:
 * - Active subscription
 * - Has remaining alerts
 * - Hasn't been sent this coin recently
 */
export async function getEligibleSubscriptions(
  coinIds: string[],
  direction: 'bullish' | 'bearish',
  deduplicationHours: number = 6
): Promise<Map<number, AlertSubscription>> {
  // Get all active subscriptions
  const subscriptions = await getActiveSubscriptions();

  // Filter by direction preference
  const filtered = subscriptions.filter((sub) => {
    if (direction === 'bullish' && !sub.enableBullish) return false;
    if (direction === 'bearish' && !sub.enableBearish) return false;
    return true;
  });

  // Build map of eligible subscriptions
  const eligible = new Map<number, AlertSubscription>();

  for (const sub of filtered) {
    // Check rate limit
    if (!(await hasRemainingAlerts(sub))) {
      continue;
    }

    eligible.set(sub.id, sub);
  }

  return eligible;
}

/**
 * Batch log multiple alerts
 */
export async function logAlertsBatch(
  alerts: NewAlertHistoryRow[]
): Promise<void> {
  if (alerts.length === 0) return;

  const db = getDb();
  await db.insert(alertHistory).values(alerts);
}

/**
 * Clean up old alert history (older than X days)
 */
export async function cleanupOldAlertHistory(days: number = 30): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(alertHistory)
    .where(gt(alertHistory.sentAt, cutoff))
    .returning({ id: alertHistory.id });

  return result.length;
}
