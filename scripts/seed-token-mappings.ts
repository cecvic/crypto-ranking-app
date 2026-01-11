/**
 * Seed script for token mappings (ERC-20 contract address to CoinGecko ID)
 * Run with: npx tsx scripts/seed-token-mappings.ts
 */

import { upsertTokenMapping } from '../src/lib/db/whale-queries';

// Top 20 ERC-20 tokens by market cap with their contract addresses
const TOKEN_MAPPINGS = [
  // Stablecoins
  {
    contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    coinGeckoId: 'tether',
    decimals: 6,
    chain: 'ethereum',
  },
  {
    contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    coinGeckoId: 'usd-coin',
    decimals: 6,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    coinGeckoId: 'dai',
    decimals: 18,
    chain: 'ethereum',
  },
  // Wrapped tokens
  {
    contractAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    symbol: 'WBTC',
    coinGeckoId: 'wrapped-bitcoin',
    decimals: 8,
    chain: 'ethereum',
  },
  {
    contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    symbol: 'WETH',
    coinGeckoId: 'weth',
    decimals: 18,
    chain: 'ethereum',
  },
  // Layer 2 tokens
  {
    contractAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    symbol: 'MATIC',
    coinGeckoId: 'matic-network',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x912ce59144191c1204e64559fe8253a0e49e6548',
    symbol: 'ARB',
    coinGeckoId: 'arbitrum',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x4200000000000000000000000000000000000042',
    symbol: 'OP',
    coinGeckoId: 'optimism',
    decimals: 18,
    chain: 'ethereum',
  },
  // DeFi tokens
  {
    contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
    symbol: 'LINK',
    coinGeckoId: 'chainlink',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    symbol: 'UNI',
    coinGeckoId: 'uniswap',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    symbol: 'AAVE',
    coinGeckoId: 'aave',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    symbol: 'MKR',
    coinGeckoId: 'maker',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    symbol: 'CRV',
    coinGeckoId: 'curve-dao-token',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
    symbol: 'LDO',
    coinGeckoId: 'lido-dao',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    symbol: 'SNX',
    coinGeckoId: 'havven',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    symbol: 'COMP',
    coinGeckoId: 'compound-governance-token',
    decimals: 18,
    chain: 'ethereum',
  },
  // Exchange tokens
  {
    contractAddress: '0xb8c77482e45f1f44de1745f52c74426c631bdd52',
    symbol: 'BNB',
    coinGeckoId: 'binancecoin',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x75231f58b43240c9718dd58b4967c5114342a86c',
    symbol: 'OKB',
    coinGeckoId: 'okb',
    decimals: 18,
    chain: 'ethereum',
  },
  // Other major tokens
  {
    contractAddress: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
    symbol: 'SHIB',
    coinGeckoId: 'shiba-inu',
    decimals: 18,
    chain: 'ethereum',
  },
  {
    contractAddress: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3',
    symbol: 'LEO',
    coinGeckoId: 'leo-token',
    decimals: 18,
    chain: 'ethereum',
  },
];

async function main() {
  console.log('Seeding token mappings...');

  let seeded = 0;
  for (const mapping of TOKEN_MAPPINGS) {
    try {
      await upsertTokenMapping(mapping);
      console.log(`  Seeded ${mapping.symbol} (${mapping.contractAddress})`);
      seeded++;
    } catch (error) {
      console.error(`  Failed to seed ${mapping.symbol}:`, error);
    }
  }

  console.log(`\nDone! Seeded ${seeded}/${TOKEN_MAPPINGS.length} token mappings.`);
}

main().catch(console.error);
