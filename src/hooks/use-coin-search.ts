'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRankings } from '@/hooks/use-rankings';
import { CoinRanking } from '@/lib/types';

interface UseCoinSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: CoinRanking[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  isLoading: boolean;
}

export function useCoinSearch(): UseCoinSearchReturn {
  const { data: rankings, isLoading } = useRankings();
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
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery.trim() || !rankings) return [];

    const q = debouncedQuery.toLowerCase().trim();
    return rankings
      .filter((r) => {
        const name = r.coin.name.toLowerCase();
        const symbol = r.coin.symbol.toLowerCase();
        return name.includes(q) || symbol.includes(q);
      })
      .slice(0, 10);
  }, [debouncedQuery, rankings]);

  useEffect(() => {
    setIsOpen(debouncedQuery.trim().length > 0 && results.length > 0);
  }, [debouncedQuery, results.length]);

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
