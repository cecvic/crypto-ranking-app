// Resend email service for confluence alerts
import { Resend } from 'resend';
import { ConfluenceAlertEmail } from './templates/confluence-alert';

// Lazy-initialize Resend client to avoid build-time errors
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'alerts@cryptorank.app';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface AlertCoin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  confluenceLevel: number;
  direction: 'bullish' | 'bearish';
  overallScore: number;
  factors: {
    sentiment: number;
    technical: number;
    whale: number;
    ai: number;
    price: number;
  };
}

export interface SendAlertParams {
  to: string;
  coins: AlertCoin[];
  unsubscribeUrl?: string;
}

/**
 * Send a confluence alert email
 */
export async function sendConfluenceAlert(params: SendAlertParams): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const { to, coins, unsubscribeUrl } = params;

  // Skip if no coins or no API key
  if (coins.length === 0) {
    return { success: false, error: 'No coins to alert' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Determine primary direction (most coins are this direction)
    const bullishCount = coins.filter((c) => c.direction === 'bullish').length;
    const bearishCount = coins.filter((c) => c.direction === 'bearish').length;
    const primaryDirection = bullishCount >= bearishCount ? 'bullish' : 'bearish';

    // Create subject line
    const directionEmoji = primaryDirection === 'bullish' ? '🟢' : '🔴';
    const directionLabel = primaryDirection === 'bullish' ? 'Bullish' : 'Bearish';
    const coinNames = coins
      .slice(0, 3)
      .map((c) => c.symbol)
      .join(', ');
    const moreText = coins.length > 3 ? ` +${coins.length - 3} more` : '';

    const subject = `${directionEmoji} ${directionLabel} Confluence: ${coinNames}${moreText}`;

    // Send email
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      react: ConfluenceAlertEmail({
        coins,
        dashboardUrl: `${APP_URL}/dashboard`,
        unsubscribeUrl: unsubscribeUrl || `${APP_URL}/api/alerts/unsubscribe`,
      }),
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[email] Sent alert to ${to}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[email] Failed to send:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a batch of alerts to multiple users
 */
export async function sendAlertsBatch(
  alerts: Array<{
    to: string;
    coins: AlertCoin[];
    unsubscribeToken?: string;
  }>
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const alert of alerts) {
    const result = await sendConfluenceAlert({
      to: alert.to,
      coins: alert.coins,
      unsubscribeUrl: alert.unsubscribeToken
        ? `${APP_URL}/api/alerts/unsubscribe?token=${alert.unsubscribeToken}`
        : undefined,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${alert.to}: ${result.error}`);
      }
    }

    // Small delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { sent, failed, errors };
}
