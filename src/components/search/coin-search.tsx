'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SearchIcon, XIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCoinSearch, SearchResult } from '@/hooks/use-coin-search';

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(6)}`;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function CoinSearch(): React.ReactElement {
  const router = useRouter();
  const {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    isLoading,
  } = useCoinSearch();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigateToCoin = useCallback(
    (coinId: string) => {
      router.push(`/coin/${coinId}`);
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [router, setQuery, setIsOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateToCoin(results[selectedIndex].coin.id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, selectedIndex, results, setSelectedIndex, setIsOpen, navigateToCoin],
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const showNoResults = query.trim().length > 0 && results.length === 0 && !isLoading;

  return (
    <div ref={containerRef} className="relative w-64">
      {/* Search input */}
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder="Search coins..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        className="pl-9 h-9 w-full"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            setIsOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {results.map((result, index) => {
            const coin = result.coin;
            const change = coin.price_change_percentage_24h;
            const isPositive = change >= 0;

            return (
              <button
                key={coin.id}
                onClick={() => navigateToCoin(coin.id)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-accent'
                    : 'hover:bg-accent/50',
                )}
              >
                {/* Coin image */}
                <Image
                  src={coin.image}
                  alt={coin.name}
                  width={28}
                  height={28}
                  className="rounded-full shrink-0"
                />

                {/* Name + symbol */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">
                      {coin.name}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {coin.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatPrice(coin.current_price)}
                    </span>
                    <span
                      className={cn(
                        'text-xs flex items-center gap-0.5',
                        isPositive ? 'text-green-500' : 'text-red-500',
                      )}
                    >
                      {isPositive ? (
                        <TrendingUpIcon className="w-3 h-3" />
                      ) : (
                        <TrendingDownIcon className="w-3 h-3" />
                      )}
                      {formatChange(change)}
                    </span>
                  </div>
                </div>

                {/* Rank badge */}
                {result.rank && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    #{result.rank}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {isOpen && results.length === 0 && isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 px-3 py-4 text-center text-sm text-muted-foreground">
          Searching...
        </div>
      )}

      {/* No results */}
      {showNoResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 px-3 py-4 text-center text-sm text-muted-foreground">
          No coins found
        </div>
      )}
    </div>
  );
}

/**
 * Mobile search button that shows a full-screen search overlay
 */
export function MobileCoinSearch(): React.ReactElement {
  const router = useRouter();
  const {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
  } = useCoinSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const isOverlayOpen = isOpen || query.length > 0;

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setIsOpen]);

  const closeSearch = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, [setQuery, setIsOpen]);

  const navigateToCoin = useCallback(
    (coinId: string) => {
      router.push(`/coin/${coinId}`);
      closeSearch();
    },
    [router, closeSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateToCoin(results[selectedIndex].coin.id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeSearch();
          break;
      }
    },
    [selectedIndex, results, setSelectedIndex, navigateToCoin, closeSearch],
  );

  return (
    <>
      {/* Search icon trigger */}
      <button
        onClick={openSearch}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Search coins"
      >
        <SearchIcon className="w-5 h-5" />
      </button>

      {/* Full-screen overlay */}
      {isOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="container pt-4">
            {/* Search input row */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={inputRef}
                  placeholder="Search coins..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 h-10 w-full"
                  autoFocus
                />
              </div>
              <button
                onClick={closeSearch}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="border rounded-md overflow-y-auto max-h-[calc(100vh-80px)]">
                {results.map((result, index) => {
                  const coin = result.coin;
                  const change = coin.price_change_percentage_24h;
                  const isPositive = change >= 0;

                  return (
                    <button
                      key={coin.id}
                      onClick={() => navigateToCoin(coin.id)}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors',
                        index === selectedIndex
                          ? 'bg-accent'
                          : 'hover:bg-accent/50',
                      )}
                    >
                      <Image
                        src={coin.image}
                        alt={coin.name}
                        width={32}
                        height={32}
                        className="rounded-full shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{coin.name}</span>
                          <span className="text-sm text-muted-foreground uppercase">
                            {coin.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-muted-foreground">
                            {formatPrice(coin.current_price)}
                          </span>
                          <span
                            className={cn(
                              'text-sm',
                              isPositive ? 'text-green-500' : 'text-red-500',
                            )}
                          >
                            {formatChange(change)}
                          </span>
                        </div>
                      </div>
                      {result.rank && (
                        <Badge variant="secondary">#{result.rank}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {query.trim().length > 0 && results.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No coins found
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
