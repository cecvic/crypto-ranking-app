// QStash Signature Verification for Cron Endpoints
// Protects endpoints from unauthorized access (Tiger 1 mitigation)

import { Receiver } from '@upstash/qstash';
import { NextRequest, NextResponse } from 'next/server';

// Lazy-loaded receiver
let _receiver: Receiver | null = null;

function getReceiver(): Receiver {
  if (!_receiver) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentSigningKey || !nextSigningKey) {
      throw new Error('QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY must be set');
    }

    _receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });
  }
  return _receiver;
}

export type CronHandler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Wrapper to verify QStash signatures on cron endpoints
 *
 * Usage:
 * ```typescript
 * export const POST = verifyCronRequest(async (req) => {
 *   // Your cron logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function verifyCronRequest(handler: CronHandler): CronHandler {
  return async (req: NextRequest) => {
    // Skip verification in development if no keys configured
    if (process.env.NODE_ENV === 'development') {
      const hasKeys = process.env.QSTASH_CURRENT_SIGNING_KEY &&
                      process.env.QSTASH_NEXT_SIGNING_KEY;
      if (!hasKeys) {
        console.log('[QStash] Skipping verification in development (no keys configured)');
        return handler(req);
      }
    }

    try {
      const receiver = getReceiver();
      const signature = req.headers.get('upstash-signature');

      if (!signature) {
        console.error('[QStash] Missing signature header');
        return NextResponse.json(
          { error: 'Unauthorized: Missing signature' },
          { status: 401 }
        );
      }

      // Get the raw body for verification
      const body = await req.text();

      // Verify the signature
      const isValid = await receiver.verify({
        signature,
        body,
        url: req.url,
      });

      if (!isValid) {
        console.error('[QStash] Invalid signature');
        return NextResponse.json(
          { error: 'Unauthorized: Invalid signature' },
          { status: 401 }
        );
      }

      // Re-create request with the body since we consumed it
      const verifiedReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: body || undefined,
      });

      return handler(verifiedReq);
    } catch (error) {
      console.error('[QStash] Verification error:', error);
      return NextResponse.json(
        { error: 'Unauthorized: Verification failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Alternative: Allow both QStash and local development requests
 * Use this for endpoints that need to be callable during development
 */
export function verifyCronRequestWithDevBypass(handler: CronHandler): CronHandler {
  return async (req: NextRequest) => {
    // Allow bypass with dev secret in development/local
    const devSecret = req.headers.get('x-dev-secret');
    if (devSecret === process.env.CRON_DEV_SECRET) {
      console.log('[QStash] Dev bypass accepted');
      return handler(req);
    }

    // Otherwise use standard verification
    return verifyCronRequest(handler)(req);
  };
}
