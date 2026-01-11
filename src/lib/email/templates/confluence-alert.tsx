// React Email template for confluence alerts
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Row,
  Column,
} from '@react-email/components';

interface AlertCoin {
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

interface ConfluenceAlertEmailProps {
  coins: AlertCoin[];
  dashboardUrl: string;
  unsubscribeUrl: string;
}

// Factor display names
const FACTOR_LABELS: Record<keyof AlertCoin['factors'], string> = {
  sentiment: 'Sentiment',
  technical: 'Technical',
  whale: 'Whale Activity',
  ai: 'AI Analysis',
  price: 'Price Action',
};

// Get score indicator
function getScoreIndicator(score: number, direction: 'bullish' | 'bearish'): string {
  const threshold = direction === 'bullish' ? 60 : 40;
  if (direction === 'bullish') {
    return score >= threshold ? '🟢' : '⚪';
  } else {
    return score <= threshold ? '🔴' : '⚪';
  }
}

export function ConfluenceAlertEmail({
  coins,
  dashboardUrl,
  unsubscribeUrl,
}: ConfluenceAlertEmailProps) {
  // Determine primary direction for email styling
  const bullishCount = coins.filter((c) => c.direction === 'bullish').length;
  const primaryDirection = bullishCount >= coins.length / 2 ? 'bullish' : 'bearish';
  const headerEmoji = primaryDirection === 'bullish' ? '🟢' : '🔴';
  const headerText = primaryDirection === 'bullish' ? 'Bullish' : 'Bearish';
  const accentColor = primaryDirection === 'bullish' ? '#22c55e' : '#ef4444';

  const previewText = `${headerEmoji} ${coins.length} coin${coins.length > 1 ? 's' : ''} showing ${headerText.toLowerCase()} confluence`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>
              {headerEmoji} {headerText} Confluence Alert
            </Heading>
            <Text style={headerSubtitle}>
              {coins.length} coin{coins.length > 1 ? 's' : ''} with {coins[0]?.confluenceLevel || 4}+/5 factors aligned
            </Text>
          </Section>

          {/* Coin Cards */}
          {coins.map((coin, index) => (
            <Section key={coin.id} style={coinCard}>
              {/* Coin Header */}
              <Row>
                <Column style={{ width: '50px' }}>
                  <Img
                    src={coin.image}
                    width="40"
                    height="40"
                    alt={coin.name}
                    style={coinImage}
                  />
                </Column>
                <Column>
                  <Text style={coinName}>{coin.name}</Text>
                  <Text style={coinSymbol}>{coin.symbol.toUpperCase()}</Text>
                </Column>
                <Column style={{ textAlign: 'right' as const }}>
                  <Text style={{
                    ...confluenceBadge,
                    backgroundColor: coin.direction === 'bullish' ? '#22c55e20' : '#ef444420',
                    color: coin.direction === 'bullish' ? '#22c55e' : '#ef4444',
                  }}>
                    {coin.confluenceLevel}/5 {coin.direction === 'bullish' ? 'Bullish' : 'Bearish'}
                  </Text>
                </Column>
              </Row>

              {/* Overall Score */}
              <Text style={overallScoreLabel}>
                Overall Score: <span style={{ fontWeight: 'bold', color: '#fff' }}>{coin.overallScore.toFixed(0)}</span>
              </Text>

              {/* Factor Breakdown */}
              <Text style={factorTitle}>Factor Breakdown:</Text>
              <Section style={factorList}>
                {(Object.entries(coin.factors) as [keyof AlertCoin['factors'], number][]).map(([key, value]) => (
                  <Row key={key} style={factorRow}>
                    <Column style={{ width: '140px' }}>
                      <Text style={factorLabel}>{FACTOR_LABELS[key]}</Text>
                    </Column>
                    <Column style={{ width: '50px' }}>
                      <Text style={factorValue}>{value.toFixed(0)}</Text>
                    </Column>
                    <Column>
                      <Text style={factorIndicator}>
                        {getScoreIndicator(value, coin.direction)}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>

              {index < coins.length - 1 && <Hr style={divider} />}
            </Section>
          ))}

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button style={{
              ...ctaButton,
              backgroundColor: accentColor,
            }} href={dashboardUrl}>
              View on Dashboard
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you subscribed to confluence alerts on CryptoRank.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe from alerts
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#0f0f23',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const header = {
  backgroundColor: '#1a1a3e',
  borderRadius: '12px 12px 0 0',
  padding: '24px',
  textAlign: 'center' as const,
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const headerSubtitle = {
  color: '#9ca3af',
  fontSize: '14px',
  margin: '0',
};

const coinCard = {
  backgroundColor: '#1a1a3e',
  padding: '20px 24px',
};

const coinImage = {
  borderRadius: '50%',
};

const coinName = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const coinSymbol = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '4px 0 0',
};

const confluenceBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const overallScoreLabel = {
  color: '#9ca3af',
  fontSize: '14px',
  margin: '16px 0 8px',
};

const factorTitle = {
  color: '#9ca3af',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '16px 0 8px',
};

const factorList = {
  backgroundColor: '#0f0f23',
  borderRadius: '8px',
  padding: '12px 16px',
};

const factorRow = {
  marginBottom: '8px',
};

const factorLabel = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0',
};

const factorValue = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '0',
};

const factorIndicator = {
  fontSize: '12px',
  margin: '0',
};

const divider = {
  borderColor: '#2a2a4e',
  margin: '20px 0',
};

const ctaSection = {
  backgroundColor: '#1a1a3e',
  borderRadius: '0 0 12px 12px',
  padding: '24px',
  textAlign: 'center' as const,
};

const ctaButton = {
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
};

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 8px',
};

const unsubscribeLink = {
  color: '#9ca3af',
  fontSize: '12px',
  textDecoration: 'underline',
};

export default ConfluenceAlertEmail;
