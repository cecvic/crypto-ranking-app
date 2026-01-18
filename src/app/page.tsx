import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUpIcon,
  BrainCircuitIcon,
  WalletIcon,
  ArrowRightIcon,
  ZapIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react';
import { AnimatedBackground } from '@/components/landing/animated-background';
import { GlassCard, FeatureCard, StatCard } from '@/components/landing/glass-card';
import {
  AnimatedHeadline,
  GradientText,
  FadeUpText,
  AnimatedCounter,
  StaggerContainer,
  StaggerItem,
} from '@/components/landing/animated-text';
import { GlowButton, AnimatedButtonGroup, PulseIndicator } from '@/components/landing/glow-button';
import { TrustLogos } from '@/components/landing/trust-logos';
import { DashboardPreview } from '@/components/landing/dashboard-preview';
import { UseCasesSection } from '@/components/landing/use-cases';
import { FAQSection } from '@/components/landing/faq';
import { CommunitySection } from '@/components/landing/community';
import { SectionDivider } from '@/components/landing/section-divider';

async function getFearGreed() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fear-greed`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const fearGreed = await getFearGreed();

  return (
    <AnimatedBackground>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="https://media.licdn.com/dms/image/v2/D560BAQHqjfvEKywCaA/company-logo_200_200/company-logo_200_200/0/1700268040211?e=1769644800&v=beta&t=2eshwxS2veQKNMM6qzGG6DLdBnJ_l0SfIHQeCQU0Yo4"
              alt="Trendhubs"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="font-bold text-lg">Trendhubs</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <GlowButton href="/sign-up" size="default">
              Get Started
            </GlowButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="container max-w-5xl text-center space-y-8">
          <AnimatedHeadline>
            Crypto Rankings
            <br />
            <GradientText>Powered by AI</GradientText>
          </AnimatedHeadline>

          <FadeUpText
            as="p"
            delay={0.2}
            className="text-fluid-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Make smarter trading decisions with our 5-factor analysis combining sentiment,
            technical indicators, whale tracking, and AI predictions.
          </FadeUpText>

          <AnimatedButtonGroup>
            <GlowButton href="/sign-up" size="lg" icon={<ArrowRightIcon className="h-4 w-4" />}>
              Start Free
            </GlowButton>
            <GlowButton href="/sign-in" variant="secondary" size="lg">
              Sign In
            </GlowButton>
          </AnimatedButtonGroup>

          {/* Social Proof */}
          <FadeUpText delay={0.6} className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center border-2 border-background">
                <UsersIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center border-2 border-background">
                <span className="text-xs font-bold text-accent">+</span>
              </div>
            </div>
            <span>Join <span className="text-foreground font-semibold">2,500+</span> traders tracking the market</span>
          </FadeUpText>

          {/* Fear & Greed Indicator */}
          {fearGreed && (
            <div className="pt-8">
              <PulseIndicator value={fearGreed.value} label={fearGreed.value_classification} />
            </div>
          )}

          {/* Dashboard Preview */}
          <DashboardPreview />
        </div>
      </section>

      {/* Trust Logos */}
      <TrustLogos />

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container max-w-6xl">
          <FadeUpText as="div" className="text-center mb-16">
            <h2 className="text-fluid-3xl font-bold mb-4">
              <GradientText animated={false}>5-Factor</GradientText> Analysis
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-fluid-base">
              Our proprietary ranking system combines multiple data sources to give you a
              comprehensive view of each cryptocurrency.
            </p>
          </FadeUpText>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StaggerItem>
              <FeatureCard
                icon={<TrendingUpIcon className="h-6 w-6" />}
                title="Sentiment Analysis"
                description="Track social media buzz, news sentiment, and market fear/greed to gauge market psychology."
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<BarChart3Icon className="h-6 w-6" />}
                title="Technical Indicators"
                description="RSI, MACD, Bollinger Bands, and SuperTrend analysis for technical trading signals."
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<WalletIcon className="h-6 w-6" />}
                title="Whale Tracking"
                description="Monitor large transactions, exchange flows, and TVL changes from big players."
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<BrainCircuitIcon className="h-6 w-6" />}
                title="AI Predictions"
                description="Machine learning price forecasts and neural network analysis for future trends."
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<ZapIcon className="h-6 w-6" />}
                title="Real-Time Updates"
                description="Live data refreshed every minute from multiple premium data sources."
              />
            </StaggerItem>
            <StaggerItem>
              <FeatureCard
                icon={<ShieldCheckIcon className="h-6 w-6" />}
                title="Top 100 Coverage"
                description="Comprehensive analysis of the top cryptocurrencies by market cap."
              />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      <SectionDivider variant="gradient" />

      {/* Use Cases / Personas */}
      <UseCasesSection />

      <SectionDivider variant="dots" />

      {/* Stats Section */}
      <section className="py-24 px-4">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <GlassCard hover={false} delay={0} className="text-center py-8">
              <div className="text-fluid-4xl font-bold gradient-text">
                <AnimatedCounter value={100} suffix="+" />
              </div>
              <div className="text-muted-foreground mt-2 text-sm">Coins Tracked</div>
            </GlassCard>
            <GlassCard hover={false} delay={0.1} className="text-center py-8">
              <div className="text-fluid-4xl font-bold gradient-text">
                <AnimatedCounter value={5} />
              </div>
              <div className="text-muted-foreground mt-2 text-sm">Data Sources</div>
            </GlassCard>
            <GlassCard hover={false} delay={0.2} className="text-center py-8">
              <div className="text-fluid-4xl font-bold gradient-text">
                <AnimatedCounter value={60} suffix="s" />
              </div>
              <div className="text-muted-foreground mt-2 text-sm">Refresh Rate</div>
            </GlassCard>
            <GlassCard hover={false} delay={0.3} className="text-center py-8">
              <div className="text-fluid-4xl font-bold gradient-text">
                <AnimatedCounter value={24} suffix="/7" />
              </div>
              <div className="text-muted-foreground mt-2 text-sm">Monitoring</div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4">
        <div className="container max-w-4xl">
          <FadeUpText as="div" className="text-center mb-16">
            <h2 className="text-fluid-3xl font-bold mb-4">
              How It <GradientText animated={false}>Works</GradientText>
            </h2>
          </FadeUpText>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-primary via-accent to-cyan-500 hidden md:block" />

            <div className="space-y-8 md:space-y-12">
              <FadeUpText delay={0} className="flex gap-6 items-start">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 relative z-10">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <GlassCard hover={false} className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Sign Up Free</h3>
                  <p className="text-muted-foreground">
                    Create your account in seconds with Google OAuth. No credit card required.
                  </p>
                </GlassCard>
              </FadeUpText>

              <FadeUpText delay={0.1} className="flex gap-6 items-start">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0 relative z-10">
                  <span className="text-2xl font-bold text-accent">2</span>
                </div>
                <GlassCard hover={false} className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Explore Rankings</h3>
                  <p className="text-muted-foreground">
                    Browse our AI-powered rankings of 100+ cryptocurrencies with real-time data.
                  </p>
                </GlassCard>
              </FadeUpText>

              <FadeUpText delay={0.2} className="flex gap-6 items-start">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0 relative z-10">
                  <span className="text-2xl font-bold text-cyan-400">3</span>
                </div>
                <GlassCard hover={false} className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Make Smarter Trades</h3>
                  <p className="text-muted-foreground">
                    Use our 5-factor analysis to inform your trading decisions and stay ahead of the market.
                  </p>
                </GlassCard>
              </FadeUpText>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider variant="glow" />

      {/* FAQ Section */}
      <FAQSection />

      {/* Community Section */}
      <CommunitySection />

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container max-w-4xl">
          <GlassCard hover={false} className="text-center py-16 px-8">
            <FadeUpText as="div">
              <SparklesIcon className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-fluid-3xl font-bold mb-4">
                Ready to Make <GradientText>Smarter Trades</GradientText>?
              </h2>
              <p className="text-muted-foreground text-fluid-base max-w-xl mx-auto mb-8">
                Join Trendhubs today and get access to AI-powered rankings for the top 100
                cryptocurrencies.
              </p>
              <GlowButton
                href="/sign-up"
                size="xl"
                icon={<ArrowRightIcon className="h-5 w-5" />}
              >
                Create Free Account
              </GlowButton>
            </FadeUpText>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-white/5">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image
                  src="https://media.licdn.com/dms/image/v2/D560BAQHqjfvEKywCaA/company-logo_200_200/company-logo_200_200/0/1700268040211?e=1769644800&v=beta&t=2eshwxS2veQKNMM6qzGG6DLdBnJ_l0SfIHQeCQU0Yo4"
                  alt="Trendhubs"
                  width={40}
                  height={40}
                  className="rounded-xl"
                />
                <span className="font-bold text-lg">Trendhubs</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                AI-powered crypto analytics for smarter trading decisions.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/rankings" className="hover:text-foreground transition-colors">
                    Rankings
                  </Link>
                </li>
                <li>
                  <Link href="/whale-alerts" className="hover:text-foreground transition-colors">
                    Whale Alerts
                  </Link>
                </li>
                <li>
                  <Link href="/confluence" className="hover:text-foreground transition-colors">
                    Confluence Radar
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#faq" className="hover:text-foreground transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <span className="cursor-default opacity-60">API (Coming Soon)</span>
                </li>
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <div className="text-sm text-muted-foreground">
              Data from CoinGecko, LunarCrush, TAAPI, DefiLlama & more
            </div>
            <div className="text-xs text-muted-foreground">
              Not financial advice. Do your own research.
            </div>
          </div>
        </div>
      </footer>
    </AnimatedBackground>
  );
}
