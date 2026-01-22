'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBirdeyeChains } from '@/hooks/use-birdeye-tokens';

interface ChainSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
}

// Chain display names and icons (using abbreviations)
const CHAIN_INFO: Record<string, { name: string; icon: string }> = {
  solana: { name: 'Solana', icon: 'SOL' },
  ethereum: { name: 'Ethereum', icon: 'ETH' },
  base: { name: 'Base', icon: 'BASE' },
  arbitrum: { name: 'Arbitrum', icon: 'ARB' },
  bsc: { name: 'BNB Chain', icon: 'BNB' },
  polygon: { name: 'Polygon', icon: 'MATIC' },
  optimism: { name: 'Optimism', icon: 'OP' },
  avalanche: { name: 'Avalanche', icon: 'AVAX' },
  zksync: { name: 'zkSync', icon: 'ZK' },
  sui: { name: 'Sui', icon: 'SUI' },
  aptos: { name: 'Aptos', icon: 'APT' },
};

export function ChainSelector({ value, onChange, className }: ChainSelectorProps) {
  const chains = useBirdeyeChains();

  return (
    <Select
      value={value || 'all'}
      onValueChange={(v) => onChange(v === 'all' ? undefined : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select chain" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">ALL</span>
            <span>All Chains</span>
          </span>
        </SelectItem>
        {chains.map((chain) => {
          const info = CHAIN_INFO[chain] || { name: chain, icon: chain.toUpperCase() };
          return (
            <SelectItem key={chain} value={chain}>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground w-10">
                  {info.icon}
                </span>
                <span>{info.name}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
