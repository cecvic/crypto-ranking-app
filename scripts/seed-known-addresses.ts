/**
 * Seed script for known exchange and whale addresses
 * Run with: npx tsx scripts/seed-known-addresses.ts
 */

import { upsertKnownAddress } from '../src/lib/db/whale-queries';

// Major exchange addresses (from Etherscan labels and public data)
const KNOWN_ADDRESSES = [
  // Binance
  {
    address: '0x28c6c06298d514db089934071355e5743bf21d60',
    label: 'exchange:binance',
    name: 'Binance 14',
    chain: 'ethereum',
  },
  {
    address: '0x21a31ee1afc51d94c2efccaa2092ad1028285549',
    label: 'exchange:binance',
    name: 'Binance 15',
    chain: 'ethereum',
  },
  {
    address: '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
    label: 'exchange:binance',
    name: 'Binance 16',
    chain: 'ethereum',
  },
  {
    address: '0x56eddb7aa87536c09ccc2793473599fd21a8b17f',
    label: 'exchange:binance',
    name: 'Binance 17',
    chain: 'ethereum',
  },
  {
    address: '0xf977814e90da44bfa03b6295a0616a897441acec',
    label: 'exchange:binance',
    name: 'Binance 8',
    chain: 'ethereum',
  },
  // Coinbase
  {
    address: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3',
    label: 'exchange:coinbase',
    name: 'Coinbase 1',
    chain: 'ethereum',
  },
  {
    address: '0x503828976d22510aad0201ac7ec88293211d23da',
    label: 'exchange:coinbase',
    name: 'Coinbase 2',
    chain: 'ethereum',
  },
  {
    address: '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740',
    label: 'exchange:coinbase',
    name: 'Coinbase 3',
    chain: 'ethereum',
  },
  {
    address: '0x3cd751e6b0078be393132286c442345e5dc49699',
    label: 'exchange:coinbase',
    name: 'Coinbase 4',
    chain: 'ethereum',
  },
  {
    address: '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511',
    label: 'exchange:coinbase',
    name: 'Coinbase Commerce',
    chain: 'ethereum',
  },
  // Kraken
  {
    address: '0x2910543af39aba0cd09dbb2d50200b3e800a63d2',
    label: 'exchange:kraken',
    name: 'Kraken 6',
    chain: 'ethereum',
  },
  {
    address: '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13',
    label: 'exchange:kraken',
    name: 'Kraken 4',
    chain: 'ethereum',
  },
  {
    address: '0xe853c56864a2ebe4576a807d26fdc4a0ada51919',
    label: 'exchange:kraken',
    name: 'Kraken 3',
    chain: 'ethereum',
  },
  // OKX (formerly OKEx)
  {
    address: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
    label: 'exchange:okx',
    name: 'OKX 1',
    chain: 'ethereum',
  },
  {
    address: '0x236f9f97e0e62388479bf9e5ba4889e46b0273c3',
    label: 'exchange:okx',
    name: 'OKX 2',
    chain: 'ethereum',
  },
  // Bitfinex
  {
    address: '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa',
    label: 'exchange:bitfinex',
    name: 'Bitfinex 1',
    chain: 'ethereum',
  },
  {
    address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
    label: 'exchange:bitfinex',
    name: 'Bitfinex 2',
    chain: 'ethereum',
  },
  // Huobi (now HTX)
  {
    address: '0xab5c66752a9e8167967685f1450532fb96d5d24f',
    label: 'exchange:huobi',
    name: 'Huobi 1',
    chain: 'ethereum',
  },
  {
    address: '0x6748f50f686bfbca6fe8ad62b22228b87f31ff2b',
    label: 'exchange:huobi',
    name: 'Huobi 2',
    chain: 'ethereum',
  },
  // KuCoin
  {
    address: '0xf16e9b0d03470827a95cdfd0cb8a8a3b46969b91',
    label: 'exchange:kucoin',
    name: 'KuCoin 1',
    chain: 'ethereum',
  },
  {
    address: '0x88bd4d3e2997371bceefe8d9386c6b5b4de60346',
    label: 'exchange:kucoin',
    name: 'KuCoin 2',
    chain: 'ethereum',
  },
  // Bybit
  {
    address: '0xf89d7b9c864f589bbf53a82105107622b35eaa40',
    label: 'exchange:bybit',
    name: 'Bybit 1',
    chain: 'ethereum',
  },
  // Gate.io
  {
    address: '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
    label: 'exchange:gateio',
    name: 'Gate.io 1',
    chain: 'ethereum',
  },
  // Gemini
  {
    address: '0xd24400ae8bfebb18ca49be86258a3c749cf46853',
    label: 'exchange:gemini',
    name: 'Gemini 1',
    chain: 'ethereum',
  },
  {
    address: '0x6fc82a5fe25a5cdb58bc74600a40a69c065263f8',
    label: 'exchange:gemini',
    name: 'Gemini 2',
    chain: 'ethereum',
  },
];

async function main() {
  console.log('Seeding known addresses...');

  let seeded = 0;
  for (const addr of KNOWN_ADDRESSES) {
    try {
      await upsertKnownAddress(addr);
      console.log(`  Seeded ${addr.name} (${addr.address.slice(0, 10)}...)`);
      seeded++;
    } catch (error) {
      console.error(`  Failed to seed ${addr.name}:`, error);
    }
  }

  console.log(`\nDone! Seeded ${seeded}/${KNOWN_ADDRESSES.length} known addresses.`);
}

main().catch(console.error);
