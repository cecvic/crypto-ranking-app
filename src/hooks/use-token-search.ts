'use client';

/**
 * Token search hook with debounce
 * Uses React Query for caching and debounced input
 */

import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';

/**
 * Token data returned from search
 */
export interface SearchToken {
  address: string;
  symbol: string;
  name: string;
  logoUri: string | null;
  price: number | null;
  liquidity: number | null;
  volume24h: number | null;
}

/**
 * Search results grouped by chain
 */
export interface SearchResult {
  chain: string;
  tokens: SearchToken[];
}

/**
 * Options for useTokenSearch hook
 */
export interface UseTokenSearchOptions {
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
}

/**
 * Hook for searching tokens across all chains with debounce
 *
 * @param query - Search query string
 * @param options - Hook options
 * @returns React Query result with SearchResult[] data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTokenSearch(searchInput, { enabled: isOpen });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 *
 * return data?.map(group => (
 *   <ChainGroup key={group.chain} chain={group.chain}>
 *     {group.tokens.map(token => <TokenItem key={token.address} token={token} />)}
 *   </ChainGroup>
 * ));
 * ```
 */
export function useTokenSearch(
  query: string,
  options: UseTokenSearchOptions = {}
) {
  const { enabled = true, debounceMs = 300 } = options;

  // Debounce the query to avoid too many API calls
  const [debouncedQuery] = useDebounce(query, debounceMs);

  return useQuery({
    queryKey: ['token-search', debouncedQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      const response = await fetch(
        `/api/tokens/search?q=${encodeURIComponent(debouncedQuery)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      return data.results as SearchResult[];
    },
    // Only query when enabled AND query has at least 2 characters
    enabled: enabled && debouncedQuery.length >= 2,
    // Match API cache TTL (5 minutes)
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
  });
}
