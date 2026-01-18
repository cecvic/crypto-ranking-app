'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
}

interface TrendingResponse {
  coins: TrendingCoin[];
  cached_at: string;
}

interface SuggestedPromptsProps {
  onSendMessage: (text: string) => void;
}

const FALLBACK_PROMPTS = [
  { text: "Analyze Bitcoin's current trend", token: 'Bitcoin' },
  { text: 'Show me ETH price action', token: 'Ethereum' },
  { text: 'Top DeFi protocols by TVL', token: 'DeFi' },
  { text: "What's the market sentiment?", token: 'Market' },
];

const PROMPT_TEMPLATES = [
  (name: string) => `What's happening with ${name}?`,
  (name: string) => `Analyze ${name} for me`,
  (name: string) => `Should I watch ${name}?`,
  (name: string) => `Show me ${name} price action`,
];

export function SuggestedPrompts({ onSendMessage }: SuggestedPromptsProps) {
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const response = await fetch('/api/trending');
        if (!response.ok) throw new Error('Failed to fetch');
        const data: TrendingResponse = await response.json();
        setTrending(data.coins.slice(0, 4)); // Get top 4 trending
        setError(false);
      } catch (err) {
        console.error('Failed to fetch trending:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTrending();
  }, []);

  // Generate prompts based on trending tokens or fallback to defaults
  const prompts =
    trending.length > 0
      ? trending.map((coin, i) => ({
          text: PROMPT_TEMPLATES[i % PROMPT_TEMPLATES.length](coin.name),
          token: coin.name,
        }))
      : FALLBACK_PROMPTS;

  // "Surprise me" picks a random trending token or defaults to Bitcoin
  const handleSurpriseMe = () => {
    const randomToken =
      trending.length > 0
        ? trending[Math.floor(Math.random() * trending.length)]
        : null;
    const tokenName = randomToken?.name || 'a trending cryptocurrency';
    onSendMessage(`Give me a quick analysis of ${tokenName}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Crypto Ranking AI
        </h2>
        <p className="text-muted-foreground max-w-md">
          AI-powered crypto analysis. Ask me anything about the market.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {loading ? (
          // Loading skeleton
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
            <Card className="animate-pulse bg-card/50 backdrop-blur-sm sm:col-span-2">
              <CardContent className="p-4">
                <div className="h-4 bg-primary/20 rounded w-1/2 mx-auto" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {prompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto text-left p-4 justify-start whitespace-normal bg-card/50 backdrop-blur-sm hover:bg-card/80 border-border/50"
                onClick={() => onSendMessage(prompt.text)}
              >
                <span className="text-sm">{prompt.text}</span>
              </Button>
            ))}
            <Button
              variant="secondary"
              className="h-auto text-left p-4 justify-center whitespace-normal bg-primary/10 hover:bg-primary/20 border border-primary/20 sm:col-span-2"
              onClick={handleSurpriseMe}
            >
              <span className="text-sm font-medium text-primary">
                Surprise me
              </span>
            </Button>
          </>
        )}
      </div>

      {!loading && trending.length > 0 && !error && (
        <p className="text-xs text-muted-foreground mt-6">
          Suggested based on trending tokens
        </p>
      )}
    </div>
  );
}
