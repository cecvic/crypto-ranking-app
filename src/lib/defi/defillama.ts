/**
 * DefiLlama API client for DeFi protocol data
 * Free tier - no authentication required
 */

import type { DefiProtocol } from '@/lib/types/ai';

const DEFILLAMA_BASE = 'https://api.llama.fi';

/**
 * DefiLlama API protocol response for /protocols bulk endpoint
 * Partial type - only fields we use
 */
interface DefiLlamaProtocolResponse {
  id: string;
  name: string;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  chains: string[];
  category: string;
  logo?: string;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

/**
 * DefiLlama API response for /protocol/{slug} single endpoint
 * Different structure: tvl is historical array, currentChainTvls has current values
 */
interface DefiLlamaSingleProtocolResponse {
  id: string;
  name: string;
  slug: string;
  tvl: Array<{ date: number; totalLiquidityUSD: number }>; // Historical data, NOT current TVL
  currentChainTvls: Record<string, number>; // Current TVL by chain
  chains: string[];
  category: string;
  logo?: string;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

/**
 * Fetch all protocols from DefiLlama
 * Returns array of protocols with current TVL and metadata
 */
export async function fetchProtocols(): Promise<DefiProtocol[]> {
  const response = await fetch(`${DEFILLAMA_BASE}/protocols`, {
    next: { revalidate: 0 }, // No Next.js cache, we use Redis
  });

  if (response.status === 429) {
    throw new Error('DefiLlama rate limit exceeded. Please try again in a moment.');
  }

  if (!response.ok) {
    throw new Error(`DefiLlama API error: ${response.status} ${response.statusText}`);
  }

  const data: DefiLlamaProtocolResponse[] = await response.json();

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    tvl: p.tvl,
    chainTvls: p.chainTvls ?? {},
    chains: p.chains ?? [],
    category: p.category ?? 'Unknown',
    logo: p.logo,
    change_1h: p.change_1h,
    change_1d: p.change_1d,
    change_7d: p.change_7d,
  }));
}

/**
 * Fetch a single protocol by slug
 * @param slug - Protocol slug (e.g., "aave", "uniswap", "lido")
 *
 * Note: /protocol/{slug} returns different structure than /protocols bulk endpoint:
 * - tvl is an array of historical data points, NOT a number
 * - currentChainTvls contains current TVL by chain (must sum for total)
 */
export async function fetchProtocol(slug: string): Promise<DefiProtocol> {
  const response = await fetch(`${DEFILLAMA_BASE}/protocol/${slug}`, {
    next: { revalidate: 0 },
  });

  if (response.status === 429) {
    throw new Error('DefiLlama rate limit exceeded. Please try again in a moment.');
  }

  if (response.status === 404) {
    throw new Error(`Protocol not found: ${slug}. Use slugs like "aave", "uniswap", "lido".`);
  }

  if (!response.ok) {
    throw new Error(`DefiLlama API error: ${response.status} ${response.statusText}`);
  }

  const data: DefiLlamaSingleProtocolResponse = await response.json();

  // Compute current TVL by summing all chain TVLs from currentChainTvls
  // The /protocol/{slug} endpoint returns tvl as historical array, not current value
  const tvl = Object.values(data.currentChainTvls ?? {}).reduce((sum, val) => sum + val, 0);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    tvl,
    chainTvls: data.currentChainTvls ?? {},
    chains: data.chains ?? [],
    category: data.category ?? 'Unknown',
    logo: data.logo,
    change_1h: data.change_1h,
    change_1d: data.change_1d,
    change_7d: data.change_7d,
  };
}

/**
 * Fetch all chains with TVL data
 */
export async function fetchChains(): Promise<Array<{ name: string; tvl: number }>> {
  const response = await fetch(`${DEFILLAMA_BASE}/v2/chains`, {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`DefiLlama API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
