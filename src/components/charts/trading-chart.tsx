'use client';

import { useEffect, useRef, useState, memo, useCallback } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
  LineSeries,
  UTCTimestamp,
  ISeriesApi,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
  SeriesMarker,
  Time,
} from 'lightweight-charts';
import { ChartData } from '@/lib/types';
import type { ChartAnnotation, OHLCCandle } from '@/lib/types/ai';
import { TimeframeSwitcher } from './chart-controls';
import { OHLCDrawer } from './ohlc-drawer';
import { Switch } from '@/components/ui/switch';

interface TradingChartProps {
  data: ChartData[];
  height?: number;
  type?: 'candlestick' | 'line';
  colors?: {
    background?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
    lineColor?: string;
  };
  // NEW: Swing analysis features (opt-in)
  annotations?: ChartAnnotation[];
  showAnnotations?: boolean;
  onCandleClick?: (candle: ChartData) => void;
  tokenId?: string;
  onTimeframeChange?: (days: number) => void;
  granularity?: string;
}

function TradingChartComponent({
  data,
  height = 400,
  type = 'candlestick',
  colors = {},
  annotations,
  showAnnotations: initialShowAnnotations,
  onCandleClick,
  tokenId,
  onTimeframeChange,
  granularity,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  // Only show annotation controls if annotations are provided
  const hasAnnotationFeatures = annotations !== undefined;
  const [showAnnotations, setShowAnnotations] = useState(initialShowAnnotations ?? true);
  const [selectedCandle, setSelectedCandle] = useState<OHLCCandle | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    background = 'transparent',
    textColor = '#9ca3af',
    upColor = '#22c55e',
    downColor = '#ef4444',
    lineColor = '#2962FF',
  } = colors;

  // Detect mobile for touch interactions
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: background },
        textColor: textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)', style: 1 },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)', style: 1 },
      },
      crosshair: {
        mode: 1, // Normal mode
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          labelBackgroundColor: '#374151',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          labelBackgroundColor: '#374151',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add series based on type
    if (type === 'candlestick') {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: upColor,
        downColor: downColor,
        borderVisible: false,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });

      candlestickSeries.setData(data.map(d => ({
        time: d.time as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })));

      seriesRef.current = candlestickSeries;

      // Create markers plugin for annotations (if feature is enabled)
      if (hasAnnotationFeatures) {
        markersRef.current = createSeriesMarkers(candlestickSeries, []);
      }

      // Click handler for mobile bottom sheet
      if (hasAnnotationFeatures) {
        chart.subscribeClick((param) => {
          if (param.seriesData.size > 0 && isMobile) {
            const candleData = param.seriesData.get(candlestickSeries);
            if (candleData && 'open' in candleData) {
              setSelectedCandle(candleData as OHLCCandle);
              setDrawerOpen(true);
            }
          }
          // Also call external handler if provided
          if (onCandleClick && param.seriesData.size > 0) {
            const candleData = param.seriesData.get(candlestickSeries);
            if (candleData && 'open' in candleData) {
              onCandleClick(candleData as ChartData);
            }
          }
        });
      }
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
      });

      lineSeries.setData(
        data.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.close,
        }))
      );
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize with ResizeObserver for better performance
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, height, type, background, textColor, upColor, downColor, lineColor, isMobile, hasAnnotationFeatures, onCandleClick]);

  // Update annotations when toggle changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !markersRef.current || !annotations) return;

    // Clear existing markers
    markersRef.current.setMarkers([]);

    if (showAnnotations && annotations.length > 0) {
      // Add markers for swing highs/lows
      const markers: SeriesMarker<Time>[] = annotations
        .filter((a) => (a.type === 'swing-high' || a.type === 'swing-low') && a.time)
        .map((a) => ({
          time: a.time as Time,
          position: a.type === 'swing-high' ? 'aboveBar' : 'belowBar',
          shape: a.type === 'swing-high' ? 'arrowDown' : 'arrowUp',
          color: a.type === 'swing-high' ? '#ef4444' : '#22c55e',
          text: a.label || (a.type === 'swing-high' ? 'SH' : 'SL'),
        }));

      markersRef.current.setMarkers(markers);

      // Add price lines for support/resistance
      annotations
        .filter((a) => a.type === 'support' || a.type === 'resistance')
        .forEach((a) => {
          seriesRef.current?.createPriceLine({
            price: a.price,
            color: a.type === 'support' ? '#22c55e' : '#ef4444',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: a.label || (a.type === 'support' ? 'Support' : 'Resistance'),
          });
        });
    }
  }, [showAnnotations, annotations]);

  const handleTimeframeChange = useCallback((days: string) => {
    onTimeframeChange?.(parseInt(days));
  }, [onTimeframeChange]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-card/50 rounded-lg border border-border"
        style={{ height }}
      >
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  // Original simple rendering (no annotation features)
  if (!hasAnnotationFeatures) {
    return (
      <div
        ref={chartContainerRef}
        className="rounded-lg overflow-hidden"
        style={{ height }}
      />
    );
  }

  // Enhanced rendering with controls
  return (
    <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {tokenId && (
            <span className="text-sm font-medium text-foreground">{tokenId.toUpperCase()}</span>
          )}
          {granularity && (
            <span className="text-xs text-muted-foreground">({granularity} candles)</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {onTimeframeChange && (
            <TimeframeSwitcher
              defaultValue="7"
              onValueChange={handleTimeframeChange}
            />
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Annotations</span>
            <Switch
              checked={showAnnotations}
              onCheckedChange={setShowAnnotations}
              aria-label="Toggle annotations"
            />
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="w-full touch-none" style={{ height }} />

      {/* Mobile OHLC drawer */}
      <OHLCDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        candle={selectedCandle}
      />
    </div>
  );
}

export const TradingChart = memo(TradingChartComponent);
