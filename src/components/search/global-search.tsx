'use client';

/**
 * Global search component with Cmd+K shortcut
 * Uses shadcn Command palette for search UI
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useTokenSearch } from '@/hooks/use-token-search';
import { SearchResultItem } from './search-result-item';

/**
 * Global search dialog with Cmd+K keyboard shortcut
 *
 * Features:
 * - Opens with Cmd+K (Mac) / Ctrl+K (Windows)
 * - Debounced search input (300ms)
 * - Results grouped by chain
 * - Navigate to token page on selection
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Search with debounce, only when dialog is open
  const { data: results, isLoading, error } = useTokenSearch(query, {
    enabled: open,
  });

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  // Handle token selection
  const handleSelect = useCallback((chain: string, address: string) => {
    setOpen(false);
    // Navigate to tokens page filtered by chain and address
    router.push(`/dashboard/tokens?chain=${chain}&address=${address}`);
  }, [router]);

  // Calculate total results count
  const totalResults = results?.reduce((sum, group) => sum + group.tokens.length, 0) ?? 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Tokens"
      description="Search tokens by name, symbol, or address across all chains"
    >
      <CommandInput
        placeholder="Search tokens by name, symbol, or address..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : error ? (
            <div className="py-6 text-center text-destructive">
              Search failed. Please try again.
            </div>
          ) : query.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <span>Type at least 2 characters to search</span>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              No tokens found for &quot;{query}&quot;
            </div>
          )}
        </CommandEmpty>

        {results?.map((group) => (
          <CommandGroup key={group.chain} heading={group.chain.toUpperCase()}>
            {group.tokens.map((token) => (
              <CommandItem
                key={`${group.chain}-${token.address}`}
                value={`${token.symbol} ${token.name} ${token.address}`}
                onSelect={() => handleSelect(group.chain, token.address)}
                className="cursor-pointer"
              >
                <SearchResultItem token={token} chain={group.chain} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer with result count */}
      {totalResults > 0 && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {totalResults} result{totalResults !== 1 ? 's' : ''} across{' '}
          {results?.length} chain{results?.length !== 1 ? 's' : ''}
        </div>
      )}
    </CommandDialog>
  );
}
