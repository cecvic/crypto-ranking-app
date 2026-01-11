// POST /api/webhooks/alchemy
// Receives real-time transfer events from Alchemy webhooks

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import {
  insertWhaleEvent,
  getTokenMapping,
  getKnownAddress,
} from '@/lib/db/whale-queries';

// Verify Alchemy webhook signature using HMAC-SHA256
function verifyAlchemySignature(
  body: string,
  signature: string,
  signingKey: string
): boolean {
  const hmac = createHmac('sha256', signingKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Classify transfer type based on address labels
function classifyTransfer(
  fromLabel: { label: string } | null,
  toLabel: { label: string } | null
): string {
  const fromIsExchange = fromLabel?.label?.startsWith('exchange:');
  const toIsExchange = toLabel?.label?.startsWith('exchange:');

  if (fromIsExchange && !toIsExchange) return 'exchange_outflow';
  if (!fromIsExchange && toIsExchange) return 'exchange_inflow';
  if (fromIsExchange && toIsExchange) return 'exchange_to_exchange';
  return 'wallet_to_wallet';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // 1. Verify signature
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.error('[alchemy-webhook] Missing signing key');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get('x-alchemy-signature');

    if (!signature || !verifyAlchemySignature(body, signature, signingKey)) {
      console.error('[alchemy-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = JSON.parse(body);
    const events = payload.event?.activity || [];

    console.log(`[alchemy-webhook] Received ${events.length} events`);

    // 3. Process each transfer event
    let processed = 0;
    let skipped = 0;

    const minValueUsd = parseInt(process.env.WHALE_MIN_VALUE_USD || '100000');

    for (const event of events) {
      try {
        // Calculate USD value
        // Note: Alchemy provides value in token units, we need to estimate USD
        // For now, we use raw value and will enhance with price lookup later
        const tokenValue = parseFloat(event.value || '0');

        // Skip small transactions based on token value
        // This is a rough filter - actual USD filtering would need price data
        if (tokenValue < 1) {
          skipped++;
          continue;
        }

        // Get token mapping for CoinGecko ID
        const tokenAddress = event.rawContract?.address || 'native';
        const tokenMapping = tokenAddress !== 'native'
          ? await getTokenMapping(tokenAddress)
          : null;

        // Classify transfer type
        const fromLabel = await getKnownAddress(event.fromAddress);
        const toLabel = await getKnownAddress(event.toAddress);
        const transferType = classifyTransfer(fromLabel, toLabel);

        // Parse block timestamp
        let blockTimestamp: Date;
        if (event.blockTimestamp) {
          blockTimestamp = new Date(event.blockTimestamp);
        } else {
          blockTimestamp = new Date();
        }

        // Insert whale event
        await insertWhaleEvent({
          transactionHash: event.hash,
          blockNumber: parseInt(event.blockNum, 16) || 0,
          blockTimestamp,
          tokenAddress,
          tokenSymbol: event.asset || tokenMapping?.symbol || null,
          coinGeckoId: tokenMapping?.coinGeckoId || null,
          fromAddress: event.fromAddress,
          toAddress: event.toAddress,
          valueRaw: event.rawContract?.value || '0',
          valueToken: tokenValue.toString(),
          valueUsd: null, // Will be computed with price data
          transferType,
          fromLabel: fromLabel?.label || null,
          toLabel: toLabel?.label || null,
          chain: 'ethereum',
          webhookId: payload.webhookId || null,
          rawPayload: event,
        });

        processed++;
      } catch (eventError) {
        console.error('[alchemy-webhook] Event processing error:', eventError);
        // Continue processing other events
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[alchemy-webhook] Processed ${processed}, skipped ${skipped} in ${duration}ms`
    );

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      durationMs: duration,
    });
  } catch (error) {
    console.error('[alchemy-webhook] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint for Alchemy webhook verification
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Alchemy webhook endpoint ready',
    timestamp: new Date().toISOString(),
  });
}
