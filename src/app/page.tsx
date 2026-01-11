import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChartIcon,
  TrendingUpIcon,
  BrainCircuitIcon,
  WalletIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ZapIcon,
} from 'lucide-react';

async function getFearGreed() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fear-greed`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const fearGreed = await getFearGreed();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LineChartIcon className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">CryptoRank</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="container max-w-4xl text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Crypto Rankings
            <span className="text-primary"> Powered by AI</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Make smarter trading decisions with our 5-factor analysis combining sentiment,
            technical indicators, whale tracking, and AI predictions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Fear & Greed Preview */}
      {fearGreed && (
        <section className="py-12 bg-muted/30">
          <div className="container max-w-4xl">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Market Sentiment Right Now</CardTitle>
                <CardDescription>Fear & Greed Index from Alternative.me</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="text-6xl font-bold text-primary">{fearGreed.value}</div>
                <div className="text-xl font-medium capitalize">{fearGreed.value_classification}</div>
                <p className="text-sm text-muted-foreground">
                  Sign up to see how this affects individual coin rankings
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">5-Factor Analysis</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our proprietary ranking system combines multiple data sources to give you
              a comprehensive view of each cryptocurrency.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <TrendingUpIcon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>
                  Track social media buzz, news sentiment, and market fear/greed
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <LineChartIcon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Technical Indicators</CardTitle>
                <CardDescription>
                  RSI, MACD, Bollinger Bands, and SuperTrend analysis
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <WalletIcon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Whale Tracking</CardTitle>
                <CardDescription>
                  Monitor large transactions, exchange flows, and TVL changes
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BrainCircuitIcon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Predictions</CardTitle>
                <CardDescription>
                  Machine learning price forecasts and neural network analysis
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ZapIcon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Real-Time Updates</CardTitle>
                <CardDescription>
                  Live data refreshed every minute from multiple sources
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ShieldCheckIcon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Top 100 Coverage</CardTitle>
                <CardDescription>
                  Comprehensive analysis of the top cryptocurrencies by market cap
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Make Smarter Trades?</h2>
          <p className="text-lg opacity-90">
            Join CryptoRank today and get access to AI-powered rankings for the top 100 cryptocurrencies.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">
              Create Free Account
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>CryptoRank - Data from CoinGecko, LunarCrush, TAAPI, DefiLlama & more</p>
          <p className="mt-1">Not financial advice. Do your own research.</p>
        </div>
      </footer>
    </div>
  );
}
