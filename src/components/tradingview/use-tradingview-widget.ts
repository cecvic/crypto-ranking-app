'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface UseTradingViewWidgetOptions {
  scriptUrl: string;
  containerId: string;
  config: Record<string, unknown>;
}

interface UseTradingViewWidgetReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Shared hook for managing TradingView widget lifecycle.
 * Handles script injection, cleanup on unmount/config change, and loading/error states.
 */
export function useTradingViewWidget({
  scriptUrl,
  containerId,
  config,
}: UseTradingViewWidgetOptions): UseTradingViewWidgetReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef(JSON.stringify(config));

  const injectWidget = useCallback((): (() => void) | undefined => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget content
    container.innerHTML = '';
    setIsLoading(true);
    setError(null);

    // Create the TradingView widget container
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container';

    const innerDiv = document.createElement('div');
    innerDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.appendChild(innerDiv);

    // Create script element with widget config
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = JSON.stringify({
      ...config,
      container_id: containerId,
    });

    script.onload = () => setIsLoading(false);
    script.onerror = () => {
      setError('Failed to load TradingView widget');
      setIsLoading(false);
    };

    widgetDiv.appendChild(script);
    container.appendChild(widgetDiv);

    return () => {
      container.innerHTML = '';
    };
  }, [scriptUrl, containerId, config]);

  useEffect(() => {
    const newConfig = JSON.stringify(config);
    if (newConfig === configRef.current && containerRef.current?.children.length) {
      return;
    }
    configRef.current = newConfig;

    const cleanup = injectWidget();
    return cleanup;
  }, [injectWidget, config]);

  return { containerRef, isLoading, error };
}
