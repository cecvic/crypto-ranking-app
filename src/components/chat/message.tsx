'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AnalysisTable } from './analysis-table';
import { Markdown } from './markdown';
import { TradingChart } from '@/components/charts/trading-chart';
import { SwingAnalysisPanel } from '@/components/charts/swing-analysis-panel';
import type { UIMessage } from '@ai-sdk/react';
import type { AnalysisRow, SwingAnalysis, ChartAnnotation } from '@/lib/types/ai';
import { ProtocolCard } from '@/components/defi/protocol-card';
import { DefiDisclaimer } from '@/components/defi/disclaimer';
import type { ChartData } from '@/lib/types';

interface MessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

// Tool result data structure for DeFi data
interface DefiToolResult {
  protocols?: Array<{
    name: string;
    slug: string;
    tvl: number;
    chains: string[];
    category: string;
    logo?: string;
    change_1d?: number;
  }>;
  protocol?: {
    name: string;
    slug: string;
    tvl: number;
    chains: string[];
    category: string;
    logo?: string;
    change_1d?: number;
  };
  cached_at?: string;
}

// Tool result data structure for chart data
interface ChartToolResult {
  candles?: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  tokenId?: string;
  days?: number;
  granularity?: string;
  cached_at?: string;
  swingAnalysis?: SwingAnalysis;
  annotations?: ChartAnnotation[];
}

// AI SDK 6.x tool part type - uses 'tool-{name}' pattern
interface ToolPart {
  type: string; // 'tool-get_ohlc', 'tool-get_defi_tvl', etc.
  toolName?: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: ChartToolResult | DefiToolResult;
}

// Extract text content from UIMessage parts
function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

// Parse markdown table with Category/Metric/Signal/Context headers
function parseAnalysisTable(content: string): AnalysisRow[] | null {
  // Match any table with the four columns we need
  const tableRegex =
    /\|[^\n]*Category[^\n]*Metric[^\n]*Signal[^\n]*Context[^\n]*\|[\s\S]*?(?=\n\n|\n$|$)/gi;
  const match = content.match(tableRegex);

  if (!match) return null;

  const rows: AnalysisRow[] = [];
  const lines = match[0]
    .split('\n')
    .filter((line) => line.trim() && line.includes('|'));

  // Skip header and separator rows
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c);

    if (cells.length >= 4) {
      const category = cells[0];
      const metric = cells[1];
      const signal = cells[2].toLowerCase();
      const context = cells[3];

      // Validate signal value
      if (
        ['bullish', 'neutral', 'bearish'].includes(signal) &&
        ['Momentum', 'Structure', 'Flow', 'Synthesis'].includes(category)
      ) {
        rows.push({
          category: category as AnalysisRow['category'],
          metric,
          signal: signal as AnalysisRow['signal'],
          context,
        });
      }
    }
  }

  return rows.length > 0 ? rows : null;
}

// Calculate how long ago a timestamp was
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  } catch {
    return timestamp;
  }
}

// Extract data freshness timestamp from content
function extractFreshness(content: string): string | null {
  // Look for cached_at timestamp in tool output or data mentions
  const patterns = [
    /"cached_at":\s*"([^"]+)"/i,
    /cached_at[:\s]+["']?([^"'\n,}]+)["']?/i,
    /data as of[:\s]+([^\n.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const timestamp = match[1].trim();
      // If it looks like an ISO timestamp, format it nicely
      if (timestamp.includes('T') || timestamp.includes('-')) {
        return formatTimestamp(timestamp);
      }
      return timestamp;
    }
  }

  return null;
}

// Remove table from content for separate rendering
function removeTable(content: string): string {
  const tableRegex =
    /\|[^\n]*Category[^\n]*Metric[^\n]*Signal[^\n]*Context[^\n]*\|[\s\S]*?(?=\n\n|\n$|$)/gi;
  return content.replace(tableRegex, '').trim();
}

// Extract chart data from tool parts
// AI SDK 6.x uses 'tool-{name}' for typed tools or 'dynamic-tool' for dynamic
function extractChartData(message: UIMessage): ChartToolResult | null {
  for (const part of message.parts) {
    // Check for typed tool part (tool-get_ohlc)
    if (part.type === 'tool-get_ohlc') {
      const toolPart = part as ToolPart;
      const output = toolPart.output as ChartToolResult | undefined;
      if (toolPart.state === 'output-available' && output?.candles) {
        return output;
      }
    }
    // Check for dynamic tool part
    if (part.type === 'dynamic-tool') {
      const toolPart = part as ToolPart;
      const output = toolPart.output as ChartToolResult | undefined;
      if (
        toolPart.toolName === 'get_ohlc' &&
        toolPart.state === 'output-available' &&
        output?.candles
      ) {
        return output;
      }
    }
  }
  return null;
}

// Extract DeFi data from tool parts
function extractDefiData(message: UIMessage): DefiToolResult | null {
  for (const part of message.parts) {
    // Check for get_defi_tvl tool
    if (part.type === 'tool-get_defi_tvl') {
      const toolPart = part as ToolPart;
      if (toolPart.state === 'output-available') {
        return toolPart.output as DefiToolResult;
      }
    }
    // Check for compare_protocols tool
    if (part.type === 'tool-compare_protocols') {
      const toolPart = part as ToolPart;
      if (toolPart.state === 'output-available') {
        return toolPart.output as DefiToolResult;
      }
    }
  }
  return null;
}

// Wrapper component for chart with timeframe state and live fetching
function ChartWithTimeframe({ chartData }: { chartData: ChartToolResult }) {
  const [candles, setCandles] = useState(chartData.candles!);
  const [granularity, setGranularity] = useState(chartData.granularity || '4h');
  const [selectedDays, setSelectedDays] = useState(chartData.days || 7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTimeframeChange = async (days: number) => {
    if (days === selectedDays) return;

    setSelectedDays(days);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ohlc?tokenId=${encodeURIComponent(chartData.tokenId || 'bitcoin')}&days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      setCandles(data.candles);
      setGranularity(data.granularity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart');
      // Revert to previous state on error
      setSelectedDays(selectedDays);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert to ChartData format expected by TradingChart
  const chartDataFormatted: ChartData[] = candles.map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  return (
    <div className="space-y-2 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm">Loading {selectedDays}D chart...</span>
          </div>
        </div>
      )}
      <TradingChart
        data={chartDataFormatted}
        tokenId={chartData.tokenId || 'unknown'}
        annotations={chartData.annotations}
        onTimeframeChange={handleTimeframeChange}
        granularity={granularity}
      />
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}

export function Message({ message, isStreaming }: MessageProps) {
  const isUser = message.role === 'user';
  const content = getTextContent(message);

  // Parse analysis table from assistant messages
  const analysisRows = !isUser ? parseAnalysisTable(content) : null;
  const freshness = !isUser ? extractFreshness(content) : null;
  const textContent = analysisRows ? removeTable(content) : content;

  // Extract chart data if present
  const chartData = !isUser ? extractChartData(message) : null;

  // Extract DeFi data if present
  const defiData = !isUser ? extractDefiData(message) : null;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-5 py-4',
          isUser
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-card/50 backdrop-blur-sm text-foreground border border-border/50 shadow-sm'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="space-y-4">
            {textContent && <Markdown content={textContent} />}
            {chartData && chartData.candles && (
              <div className="pt-2">
                <ChartWithTimeframe chartData={chartData} />
              </div>
            )}
            {chartData && chartData.swingAnalysis && (
              <SwingAnalysisPanel
                analysis={chartData.swingAnalysis}
                tokenId={chartData.tokenId || 'unknown'}
              />
            )}
            {defiData && (
              <div className="pt-2 space-y-4">
                {/* Protocol cards grid */}
                {defiData.protocols && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {defiData.protocols.map((protocol, i) => (
                      <ProtocolCard
                        key={protocol.slug}
                        rank={i + 1}
                        name={protocol.name}
                        tvl={protocol.tvl}
                        chain={protocol.chains[0] || 'Multi-chain'}
                        logo={protocol.logo}
                        change24h={protocol.change_1d}
                        category={protocol.category}
                      />
                    ))}
                  </div>
                )}
                {/* Single protocol card (no rank) */}
                {defiData.protocol && !defiData.protocols && (
                  <ProtocolCard
                    name={defiData.protocol.name}
                    tvl={defiData.protocol.tvl}
                    chain={defiData.protocol.chains[0] || 'Multi-chain'}
                    logo={defiData.protocol.logo}
                    change24h={defiData.protocol.change_1d}
                    category={defiData.protocol.category}
                  />
                )}
                {/* Disclaimer once per response (CRPT-04) */}
                <DefiDisclaimer />
              </div>
            )}
            {analysisRows && (
              <div className="pt-2">
                <AnalysisTable rows={analysisRows} />
              </div>
            )}
            {freshness && (
              <div className="pt-2 mt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Data as of {freshness}
                </p>
              </div>
            )}
            {isStreaming && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm">Analyzing...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
