import { Metadata } from 'next';
import { BirdeyeTokenTable } from '@/components/tokens/birdeye-token-table';

export const metadata: Metadata = {
  title: 'Token Rankings | Trendhubs',
  description: 'Multi-chain token rankings from Birdeye across 11 blockchains',
};

export default function TokensPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Token Rankings</h1>
        <p className="text-muted-foreground">
          Real-time token prices and metrics across 11 blockchains, powered by Birdeye.
        </p>
      </div>

      <BirdeyeTokenTable limit={100} />
    </div>
  );
}
