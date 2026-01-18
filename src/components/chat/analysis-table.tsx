'use client';

import { cn } from '@/lib/utils';
import type { AnalysisRow } from '@/lib/types/ai';

interface AnalysisTableProps {
  rows: AnalysisRow[];
}

const signalStyles = {
  bullish: {
    badge: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40',
    row: 'border-l-green-500',
  },
  neutral: {
    badge: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40',
    row: 'border-l-yellow-500',
  },
  bearish: {
    badge: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40',
    row: 'border-l-red-500',
  },
};

export function AnalysisTable({ rows }: AnalysisTableProps) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border bg-card/50 backdrop-blur-sm">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-semibold px-4 py-3 w-28">Category</th>
              <th className="text-left font-semibold px-4 py-3">Metric</th>
              <th className="text-left font-semibold px-4 py-3 w-24">Signal</th>
              <th className="text-left font-semibold px-4 py-3">Context</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  'border-b last:border-0 border-l-4',
                  signalStyles[row.signal].row
                )}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{row.category}</span>
                </td>
                <td className="px-4 py-3 text-foreground">{row.metric}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                      signalStyles[row.signal].badge
                    )}
                  >
                    {row.signal}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.context}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y">
        {rows.map((row, index) => (
          <div
            key={index}
            className={cn(
              'p-4 border-l-4',
              signalStyles[row.signal].row
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">{row.category}</span>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                  signalStyles[row.signal].badge
                )}
              >
                {row.signal}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{row.metric}</p>
            <p className="text-sm text-muted-foreground">{row.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
