'use client';

import { AlertTriangle } from 'lucide-react';

export function DefiDisclaimer() {
  return (
    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground">
        DeFi data is provided for informational purposes only. TVL and protocol
        metrics can change rapidly. This is not financial advice.
      </p>
    </div>
  );
}
