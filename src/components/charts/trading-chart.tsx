'use client';

import { useEffect, useRef, memo } from 'react';
import { createChart, ColorType, IChartApi, CandlestickSeries, LineSeries, UTCTimestamp } from 'lightweight-charts';
import { ChartData } from '@/lib/types';

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
}

function TradingChartComponent({
  data,
  height = 400,
  type = 'candlestick',
  colors = {},
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const {
    background = '#131722',
    textColor = '#d1d4dc',
    upColor = '#26a69a',
    downColor = '#ef5350',
    lineColor = '#2962FF',
  } = colors;

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
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 1, // Normal mode
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
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

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, type, background, textColor, upColor, downColor, lineColor]);

  // Update data when it changes
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // For real-time updates, you would use series.update() here
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-[#131722] rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-400">No chart data available</p>
      </div>
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className="rounded-lg overflow-hidden"
      style={{ height }}
    />
  );
}

export const TradingChart = memo(TradingChartComponent);
