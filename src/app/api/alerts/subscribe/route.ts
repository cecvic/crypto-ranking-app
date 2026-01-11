// Alert Subscription API
// POST - Subscribe to confluence alerts
// DELETE - Unsubscribe from alerts

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  createSubscription,
  getSubscription,
  deleteSubscription,
  hardDeleteSubscription,
} from '@/lib/db/alert-queries';

/**
 * POST /api/alerts/subscribe
 * Subscribe to confluence alerts
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user email from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: 'No email address found for user' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await getSubscription(userId);
    if (existingSubscription) {
      // Reactivate if inactive
      if (!existingSubscription.isActive) {
        const { updateSubscription } = await import('@/lib/db/alert-queries');
        const updated = await updateSubscription(userId, { isActive: true });
        return NextResponse.json({
          success: true,
          message: 'Subscription reactivated',
          subscription: {
            id: updated?.id,
            email: updated?.email,
            enableBullish: updated?.enableBullish,
            enableBearish: updated?.enableBearish,
            minConfluence: updated?.minConfluence,
            maxAlertsPerDay: updated?.maxAlertsPerDay,
            isActive: updated?.isActive,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Already subscribed',
        subscription: {
          id: existingSubscription.id,
          email: existingSubscription.email,
          enableBullish: existingSubscription.enableBullish,
          enableBearish: existingSubscription.enableBearish,
          minConfluence: existingSubscription.minConfluence,
          maxAlertsPerDay: existingSubscription.maxAlertsPerDay,
          isActive: existingSubscription.isActive,
        },
      });
    }

    // Parse optional preferences from request body
    let preferences = {
      enableBullish: true,
      enableBearish: true,
      minConfluence: 4,
    };

    try {
      const body = await request.json();
      if (typeof body.enableBullish === 'boolean') {
        preferences.enableBullish = body.enableBullish;
      }
      if (typeof body.enableBearish === 'boolean') {
        preferences.enableBearish = body.enableBearish;
      }
      if (body.minConfluence === 4 || body.minConfluence === 5) {
        preferences.minConfluence = body.minConfluence;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Create subscription
    const subscription = await createSubscription({
      clerkUserId: userId,
      email,
      enableBullish: preferences.enableBullish,
      enableBearish: preferences.enableBearish,
      minConfluence: preferences.minConfluence,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscribed to confluence alerts',
      subscription: {
        id: subscription.id,
        email: subscription.email,
        enableBullish: subscription.enableBullish,
        enableBearish: subscription.enableBearish,
        minConfluence: subscription.minConfluence,
        maxAlertsPerDay: subscription.maxAlertsPerDay,
        isActive: subscription.isActive,
      },
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to alerts' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/subscribe
 * Unsubscribe from alerts (soft delete by default)
 *
 * Query params:
 * - hard: 'true' to permanently delete subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hard = request.nextUrl.searchParams.get('hard') === 'true';

    if (hard) {
      await hardDeleteSubscription(userId);
    } else {
      await deleteSubscription(userId);
    }

    return NextResponse.json({
      success: true,
      message: hard ? 'Subscription permanently deleted' : 'Unsubscribed from alerts',
    });
  } catch (error) {
    console.error('Unsubscribe API error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from alerts' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/subscribe
 * Get current subscription status
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscription(userId);

    if (!subscription) {
      return NextResponse.json({
        subscribed: false,
        subscription: null,
      });
    }

    return NextResponse.json({
      subscribed: subscription.isActive,
      subscription: {
        id: subscription.id,
        email: subscription.email,
        enableBullish: subscription.enableBullish,
        enableBearish: subscription.enableBearish,
        minConfluence: subscription.minConfluence,
        maxAlertsPerDay: subscription.maxAlertsPerDay,
        alertsSentToday: subscription.alertsSentToday,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt?.toISOString(),
        updatedAt: subscription.updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get subscription API error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
