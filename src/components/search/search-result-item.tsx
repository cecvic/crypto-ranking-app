'use client';

/**
 * Individual search result item component
 * Displays token info with chain badge
 */

import Image from 'next/image';

interface SearchResultItemProps {
  token: {
    address: string;
    symbol: string;
    name: string;
    logoUri: string | null;
    price: number | null;
    liquidity: number | null;
  };
  chain: string;
}

/**
 * Renders a single token search result with icon, name, chain badge, and price
 */
export function SearchResultItem({ token, chain }: SearchResultItemProps) {
  // Format price for display
  const formatPrice = (price: number | null): string | null => {
    if (price === null) return null;
    if (price < 0.0001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 1000) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 w-full">
      {/* Token icon or fallback */}
      {token.logoUri ? (
        <Image
          src={token.logoUri}
          alt={token.symbol}
          width={24}
          height={24}
          className="h-6 w-6 rounded-full object-cover"
          unoptimized // External URLs from Birdeye
        />
      ) : (
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {token.symbol.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Token info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{token.symbol}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono uppercase">
            {chain}
          </span>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {token.name}
        </div>
      </div>

      {/* Price if available */}
      {token.price !== null && (
        <div className="text-sm font-mono text-right shrink-0">
          {formatPrice(token.price)}
        </div>
      )}
    </div>
  );
}
