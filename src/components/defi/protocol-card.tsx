'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProtocolCardProps {
  rank?: number;
  name: string;
  tvl: number;
  chain: string;
  logo?: string;
  change24h?: number;
  category?: string;
}

// Format TVL as $X.XXB or $X.XXM
// Defensive number coercion handles edge cases (non-number inputs)
function formatTVL(tvl: number): string {
  const value = Number(tvl);
  if (isNaN(value)) return '$--';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function ProtocolCard({
  rank,
  name,
  tvl,
  chain,
  logo,
  change24h,
  category,
}: ProtocolCardProps) {
  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {rank && (
            <span className="text-2xl font-bold text-muted-foreground">
              #{rank}
            </span>
          )}
          {logo && (
            <img src={logo} alt={name} className="w-8 h-8 rounded-full" />
          )}
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            {category && (
              <p className="text-xs text-muted-foreground">{category}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">TVL</p>
            <p className="text-xl font-semibold">{formatTVL(tvl)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Chain</p>
            <p className="text-sm font-medium">{chain}</p>
          </div>
          {change24h !== undefined && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">24h Change</p>
              <p className={cn(
                'text-sm font-medium',
                change24h >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
