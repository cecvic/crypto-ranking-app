// Alert Preferences API
// GET - Get current preferences
// PATCH - Update preferences

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSubscription, updateSubscription } from '@/lib/db/alert-queries';

/**
 * GET /api/alerts/preferences
 * Get current alert preferences
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscription(userId);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Not subscribed to alerts' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      preferences: {
        enableBullish: subscription.enableBullish,
        enableBearish: subscription.enableBearish,
        minConfluence: subscription.minConfluence,
        maxAlertsPerDay: subscription.maxAlertsPerDay,
      },
      usage: {
        alertsSentToday: subscription.alertsSentToday,
        lastResetAt: subscription.lastAlertResetAt?.toISOString(),
      },
      isActive: subscription.isActive,
    });
  } catch (error) {
    console.error('Get preferences API error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/alerts/preferences
 * Update alert preferences
 *
 * Body (all optional):
 * - enableBullish: boolean
 * - enableBearish: boolean
 * - minConfluence: 4 | 5
 * - isActive: boolean
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscription(userId);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Not subscribed to alerts' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build update object with validated fields
    const updates: {
      enableBullish?: boolean;
      enableBearish?: boolean;
      minConfluence?: number;
      isActive?: boolean;
    } = {};

    if (typeof body.enableBullish === 'boolean') {
      updates.enableBullish = body.enableBullish;
    }

    if (typeof body.enableBearish === 'boolean') {
      updates.enableBearish = body.enableBearish;
    }

    if (body.minConfluence === 4 || body.minConfluence === 5) {
      updates.minConfluence = body.minConfluence;
    }

    if (typeof body.isActive === 'boolean') {
      updates.isActive = body.isActive;
    }

    // Require at least one update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate at least one direction is enabled if both are being updated
    if (
      'enableBullish' in updates &&
      'enableBearish' in updates &&
      !updates.enableBullish &&
      !updates.enableBearish
    ) {
      return NextResponse.json(
        { error: 'At least one alert direction must be enabled' },
        { status: 400 }
      );
    }

    // Update subscription
    const updated = await updateSubscription(userId, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: {
        enableBullish: updated.enableBullish,
        enableBearish: updated.enableBearish,
        minConfluence: updated.minConfluence,
        maxAlertsPerDay: updated.maxAlertsPerDay,
      },
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('Update preferences API error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
