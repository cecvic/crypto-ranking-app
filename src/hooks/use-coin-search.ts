'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRankings } from '@/hooks/use-rankings';
import { CoinRanking, CoinPrice } from '@/lib/types';

export interface SearchResult {
  coin: CoinPrice;
  rank: number | null;
  source: 'local' | 'api';
}

interface UseCoinSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  isLoading: boolean;
}

async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.data ?? []).map((coin: CoinPrice) => ({
    coin,
    rank: coin.market_cap_rank || null,
    source: 'api' as const,
  }));
}

export function useCoinSearch(): UseCoinSearchReturn {
  const { data: rankings, isLoading: rankingsLoading } = useRankings();
  const [query, setQueryRaw] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const setQuery = useCallback((value: string) => {
    setQueryRaw(value);
    setSelectedIndex(0);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Step 1: Instant local filter against cached top 100
  const localResults = useMemo((): SearchResult[] => {
    if (!debouncedQuery.trim() || !rankings) return [];

    const q = debouncedQuery.toLowerCase().trim();
    return rankings
      .filter((r) => {
        const name = r.coin.name.toLowerCase();
        const symbol = r.coin.symbol.toLowerCase();
        return name.includes(q) || symbol.includes(q);
      })
      .slice(0, 10)
      .map((r) => ({
        coin: r.coin,
        rank: r.rank,
        source: 'local' as const,
      }));
  }, [debouncedQuery, rankings]);

  // Step 2: API fallback when local has no results and query is 2+ chars
  const shouldFetchApi = debouncedQuery.trim().length >= 2 && localResults.length === 0;

  const { data: apiResults, isLoading: apiLoading } = useQuery({
    queryKey: ['coin-search', debouncedQuery],
    queryFn: () => fetchSearchResults(debouncedQuery.trim()),
    enabled: shouldFetchApi,
    staleTime: 60000,
  });

  const results = localResults.length > 0 ? localResults : (apiResults ?? []);
  const isLoading = rankingsLoading || (shouldFetchApi && apiLoading);

  useEffect(() => {
    const hasQuery = debouncedQuery.trim().length > 0;
    setIsOpen(hasQuery && (results.length > 0 || isLoading));
  }, [debouncedQuery, results.length, isLoading]);

  return {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    isLoading,
  };
}
