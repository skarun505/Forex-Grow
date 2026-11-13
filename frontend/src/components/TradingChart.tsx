import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  ColorType,
  IPriceLine,
} from 'lightweight-charts';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { TimeframeInterval, TIMEFRAME_SECONDS, Candle } from '../types';
import {
  CandlestickChart,
  LineChart,
  Activity,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  Timer,
} from 'lucide-react';

const TIMEFRAMES: Array<{ id: TimeframeInterval; label: string; desc: string }> = [
  { id: '5s', label: '5s', desc: '5 seconds' },
  { id: '15s', label: '15s', desc: '15 seconds' },
  { id: '30s', label: '30s', desc: '30 seconds' },
  { id: '1m', label: '1m', desc: '1 minute' },
  { id: '5m', label: '5m', desc: '5 minutes' },
  { id: '10m', label: '10m', desc: '10 minutes' },
  { id: '1h', label: '1h', desc: '1 hour' },
  { id: '5h', label: '5h', desc: '5 hours' },
];

export const TradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());

  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const [candleRemainingSec, setCandleRemainingSec] = useState<number>(0);

  const {
    candles,
    currentPrice,
    selectedAsset,
    activeTrades,
    chartType,
    setChartType,
    indicators,
    toggleIndicator,
    sentiment,
    account,
    timeframe,
    setTimeframe,
    theme,
  } = useTrading();

  // Live countdown timer for current candle completion
  useEffect(() => {
    const updateCountdown = () => {
      const intervalSec = TIMEFRAME_SECONDS[timeframe] || 5;
      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = intervalSec - (nowSec % intervalSec);
      setCandleRemainingSec(remaining === 0 ? intervalSec : remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 500);
    return () => clearInterval(timer);
  }, [timeframe]);

  const hasFittedRef = useRef(false);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initialWidth = chartContainerRef.current.clientWidth || window.innerWidth || 320;
    const initialHeight = chartContainerRef.current.clientHeight || 400;

    const chart = createChart(chartContainerRef.current, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: 2,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      rightPriceScale: {
        visible: true,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Create Candlestick series
    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#00c679',
      downColor: '#ff3d5a',
      borderVisible: false,
      wickUpColor: '#00c679',
      wickDownColor: '#ff3d5a',
    });

    // Create Area series (hidden by default)
    areaSeriesRef.current = chart.addAreaSeries({
      topColor: 'rgba(0, 198, 121, 0.4)',
      bottomColor: 'rgba(0, 198, 121, 0.0)',
      lineColor: '#00c679',
      lineWidth: 2,
      visible: false,
    });

    // Create SMA series
    smaSeriesRef.current = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'SMA 9',
      visible: false,
    });

    // Create EMA series
    emaSeriesRef.current = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      title: 'EMA 21',
      visible: false,
    });

    // Create Bollinger Bands (Upper & Lower)
    bbUpperSeriesRef.current = chart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Upper',
      visible: false,
    });

    bbLowerSeriesRef.current = chart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Lower',
      visible: false,
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const w = chartContainerRef.current.clientWidth;
        const h = chartContainerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          chartRef.current.applyOptions({ width: w, height: h });
        }
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    // Remove TradingView watermark attribution logo
    const removeTvWatermark = () => {
      const logos = chartContainerRef.current?.querySelectorAll(
        '#tv-attr-logo, a[href*="tradingview.com"], [id*="tv-attr"]'
      );
      logos?.forEach((el) => el.remove());
    };
    removeTvWatermark();

    const logoObserver = new MutationObserver(removeTvWatermark);
    if (chartContainerRef.current) {
      logoObserver.observe(chartContainerRef.current, { childList: true, subtree: true });
    }

    return () => {
      resizeObserver.disconnect();
      logoObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      priceLinesRef.current.clear();
      chart.remove();
    };
  }, []);

  // Update Theme styling
  useEffect(() => {
    if (!chartRef.current) return;
    const isDark = theme === 'dark';
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#131722' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#334155',
      },
      grid: {
        vertLines: { color: isDark ? '#1e2433' : '#f1f5f9' },
        horzLines: { color: isDark ? '#1e2433' : '#e2e8f0' },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      },
    });
  }, [theme]);

  // Adjust chart precision & view whenever selected asset changes
  useEffect(() => {
    if (!selectedAsset || !chartRef.current) return;
    const dec = selectedAsset.decimalPlaces ?? 2;
    const minMove = 1 / Math.pow(10, dec);

    candleSeriesRef.current?.applyOptions({
      priceFormat: {
        type: 'price',
        precision: dec,
        minMove: minMove,
      },
    });

    areaSeriesRef.current?.applyOptions({
      priceFormat: {
        type: 'price',
        precision: dec,
        minMove: minMove,
      },
    });

    hasFittedRef.current = false;
    setTimeout(() => {
      chartRef.current?.timeScale().fitContent();
    }, 60);
  }, [selectedAsset?.id]);

  // Adjust chart view whenever candle timeframe changes
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;
    const timer = setTimeout(() => {
      chartRef.current?.timeScale().fitContent();
    }, 60);
    return () => clearTimeout(timer);
  }, [timeframe]);

  // Update Series Visibility based on ChartType & Indicators
  useEffect(() => {
    if (candleSeriesRef.current && areaSeriesRef.current) {
      candleSeriesRef.current.applyOptions({ visible: chartType === 'candlestick' });
      areaSeriesRef.current.applyOptions({ visible: chartType === 'area' });
    }
  }, [chartType]);

  useEffect(() => {
    if (smaSeriesRef.current) smaSeriesRef.current.applyOptions({ visible: indicators.sma });
    if (emaSeriesRef.current) emaSeriesRef.current.applyOptions({ visible: indicators.ema });
    if (bbUpperSeriesRef.current) bbUpperSeriesRef.current.applyOptions({ visible: indicators.bollinger });
    if (bbLowerSeriesRef.current) bbLowerSeriesRef.current.applyOptions({ visible: indicators.bollinger });
  }, [indicators]);

  // Update Chart Data & Technical Indicators
  useEffect(() => {
    if (!candles || candles.length === 0) return;

    // Strict deduplication & chronological ascending sort by unix timestamp (seconds)
    const timeMap = new Map<number, Candle>();
    for (const c of candles) {
      if (c && typeof c.time === 'number' && !isNaN(c.close) && !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low)) {
        timeMap.set(c.time, c);
      }
    }
    const sortedCandles = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
    if (sortedCandles.length === 0) return;

    const formattedCandles: CandlestickData[] = sortedCandles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedArea: LineData[] = sortedCandles.map((c) => ({
      time: c.time as any,
      value: c.close,
    }));

    try {
      if (candleSeriesRef.current) candleSeriesRef.current.setData(formattedCandles);
      if (areaSeriesRef.current) areaSeriesRef.current.setData(formattedArea);
    } catch (err) {
      console.warn('Lightweight charts setData error:', err);
    }

    if (!hasFittedRef.current && sortedCandles.length > 0) {
      hasFittedRef.current = true;
      requestAnimationFrame(() => {
        chartRef.current?.timeScale().fitContent();
      });
    }

    // Calculate SMA 9
    if (indicators.sma && smaSeriesRef.current) {
      const period = 9;
      const smaData: LineData[] = [];
      for (let i = period - 1; i < sortedCandles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += sortedCandles[i - j].close;
        }
        smaData.push({ time: sortedCandles[i].time as any, value: sum / period });
      }
      try {
        smaSeriesRef.current.setData(smaData);
      } catch (e) {}
    }

    // Calculate EMA 21
    if (indicators.ema && emaSeriesRef.current) {
      const period = 21;
      const k = 2 / (period + 1);
      const emaData: LineData[] = [];
      let ema = sortedCandles[0].close;
      for (let i = 0; i < sortedCandles.length; i++) {
        ema = sortedCandles[i].close * k + ema * (1 - k);
        if (i >= period - 1) {
          emaData.push({ time: sortedCandles[i].time as any, value: ema });
        }
      }
      try {
        emaSeriesRef.current.setData(emaData);
      } catch (e) {}
    }

    // Calculate Bollinger Bands (period 20, multiplier 2)
    if (indicators.bollinger && bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      const period = 20;
      const mult = 2;
      const upperData: LineData[] = [];
      const lowerData: LineData[] = [];

      for (let i = period - 1; i < sortedCandles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += sortedCandles[i - j].close;
        const mean = sum / period;

        let variance = 0;
        for (let j = 0; j < period; j++) variance += Math.pow(sortedCandles[i - j].close - mean, 2);
        const stdDev = Math.sqrt(variance / period);

        upperData.push({ time: sortedCandles[i].time as any, value: mean + mult * stdDev });
        lowerData.push({ time: sortedCandles[i].time as any, value: mean - mult * stdDev });
      }

      try {
        bbUpperSeriesRef.current.setData(upperData);
        bbLowerSeriesRef.current.setData(lowerData);
      } catch (e) {}
    }
  }, [candles, indicators]);

  // Update Strike Lines for Active Trades
  useEffect(() => {
    const activeSeries = chartType === 'candlestick' ? candleSeriesRef.current : areaSeriesRef.current;
    if (!activeSeries) return;

    const removeAllPriceLines = () => {
      [candleSeriesRef.current, areaSeriesRef.current].forEach((series) => {
        if (series) {
          for (const line of priceLinesRef.current.values()) {
            try {
              series.removePriceLine(line);
            } catch (err) {
              // Safe catch
            }
          }
        }
      });
      priceLinesRef.current.clear();
    };

    removeAllPriceLines();

    const relevantTrades = activeTrades.filter(
      (t) => t.assetId === selectedAsset?.id && (!t.accountType || t.accountType === account.activeAccountType)
    );
    for (const trade of relevantTrades) {
      const isUp = trade.direction === 'UP';
      const color = isUp ? '#00c679' : '#ff3d5a';
      const line = activeSeries.createPriceLine({
        price: trade.entryPrice,
        color: color,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `${trade.direction} ${formatCurrency(trade.amount, account.currency)}`,
      });
      priceLinesRef.current.set(trade.id, line);
    }

    return () => {
      removeAllPriceLines();
    };
  }, [activeTrades, selectedAsset, chartType, account.currency, account.activeAccountType]);

  const handleZoom = (factor: number) => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const newSpan = span * factor;
      const mid = (range.from + range.to) / 2;
      timeScale.setVisibleLogicalRange({
        from: mid - newSpan / 2,
        to: mid + newSpan / 2,
      });
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) chartRef.current.timeScale().resetTimeScale();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const dec = selectedAsset?.decimalPlaces ?? 4;
  const isUp = candles.length > 1 && currentPrice >= (candles[candles.length - 2]?.close ?? currentPrice);
  const bullPct = sentiment?.bullPercent ?? 65;
  const bearPct = sentiment?.bearPercent ?? 35;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#131722] overflow-hidden select-none">
      {/* Mobile Streamlined Live Price & Candle Timer Pill */}
      <div className="sm:hidden absolute top-2 left-2 z-20 flex items-center space-x-2 bg-[#1e2333]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-lg">
        <span className={`text-sm font-black mono-num ${isUp ? 'text-trade-green' : 'text-trade-red'}`}>
          {currentPrice.toFixed(dec)}
        </span>
        <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
          +{selectedAsset?.payout}%
        </span>
        <div className="flex items-center space-x-1 font-mono text-[10px] text-amber-400 bg-black/30 px-1.5 py-0.5 rounded border border-amber-400/20">
          <Timer className="w-2.5 h-2.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="font-bold">{candleRemainingSec}s</span>
        </div>
      </div>

      {/* Desktop Top Floating Info & Asset Banner */}
      <div className="hidden sm:flex absolute top-4 left-5 z-20 items-center space-x-4 bg-[#1e2333]/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/5 shadow-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-300 font-bold">{selectedAsset?.name || 'Asset'}</span>
            {selectedAsset?.isRealFeed && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 mt-0.5">
            <span className={`text-2xl font-black mono-num tracking-tight ${isUp ? 'text-trade-green' : 'text-trade-red'}`}>
              {currentPrice.toFixed(dec)}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 ${
                isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              <span>+{selectedAsset?.payout}%</span>
            </span>

            {/* Live New Candle Countdown Timer */}
            <div
              title={`Next ${timeframe} candle forms in ${candleRemainingSec}s`}
              className="flex items-center space-x-1.5 bg-[#121620]/90 border border-emerald-500/30 px-2.5 py-1 rounded-xl shadow-inner"
            >
              <Timer className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-[10px] text-gray-400 font-bold uppercase">New:</span>
                <span className="text-xs font-black text-amber-400 mono-num">
                  {candleRemainingSec >= 60
                    ? `${Math.floor(candleRemainingSec / 60)}m ${candleRemainingSec % 60}s`
                    : `${candleRemainingSec}s`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Quotex Sentiment Meter (Left Edge) - Hidden on mobile to keep chart uncluttered */}
      <div className="hidden sm:flex absolute left-4 top-28 z-20 flex-col items-center bg-[#1e2333]/85 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-xl w-12">
        <span className="text-[9px] font-bold text-emerald-400 mb-1">{bullPct}%</span>
        {/* Dual Color Vertical Bar */}
        <div className="w-2.5 h-32 bg-[#121620] rounded-full overflow-hidden flex flex-col relative border border-white/5">
          <div
            style={{ height: `${bullPct}%` }}
            className="w-full bg-gradient-to-b from-trade-green to-emerald-500 transition-all duration-700 rounded-t-full shadow-lg shadow-emerald-500/50"
          />
          <div
            style={{ height: `${bearPct}%` }}
            className="w-full bg-gradient-to-t from-trade-red to-rose-500 transition-all duration-700 rounded-b-full shadow-lg shadow-rose-500/50"
          />
        </div>
        <span className="text-[9px] font-bold text-rose-400 mt-1">{bearPct}%</span>
        <span className="text-[8px] font-semibold text-gray-400 uppercase mt-1 tracking-tighter">SENT</span>
      </div>

      {/* Floating Chart Toolbar (Docked cleanly at bottom left on both mobile and desktop) */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-5 z-20 flex items-center space-x-1 sm:space-x-2 bg-[#1e2333]/90 backdrop-blur-md px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-white/5 shadow-xl">
        {/* Candlestick Toggle */}
        <button
          title="Candlestick Chart"
          onClick={() => setChartType('candlestick')}
          className={`p-2 rounded-xl transition ${
            chartType === 'candlestick' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <CandlestickChart className="w-4 h-4" />
        </button>

        {/* Area Line Toggle */}
        <button
          title="Area Mountain Chart"
          onClick={() => setChartType('area')}
          className={`p-2 rounded-xl transition ${
            chartType === 'area' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <LineChart className="w-4 h-4" />
        </button>

        {/* Timeframe Interval Selector */}
        <div className="relative">
          <button
            title="Candle Timeframe Interval & Next Candle Countdown"
            onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
            className="p-1.5 sm:px-2.5 py-1.5 rounded-xl flex items-center space-x-1.5 text-xs font-bold text-gray-200 hover:text-white bg-[#222838]/80 hover:bg-[#2b3347] transition border border-[#2e354b]"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-400 font-black">{timeframe}</span>
            <span className="text-[10px] text-amber-400 font-mono font-bold bg-[#121620] px-1.5 py-0.5 rounded border border-amber-400/20">
              {candleRemainingSec}s
            </span>
          </button>

          {showTimeframeMenu && (
            <div className="absolute bottom-11 left-0 w-52 bg-[#1a1f2e] border border-[#2e354b] rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-black uppercase text-gray-400 px-2 pb-2 border-b border-[#2e354b] flex items-center justify-between">
                <span>CANDLE TIMELINE</span>
                <span className="text-emerald-400 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {timeframe} ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => {
                      setTimeframe(tf.id);
                      setShowTimeframeMenu(false);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      timeframe === tf.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-gray-300 bg-[#121620]/60 hover:bg-[#222838] hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="font-mono">{tf.label}</span>
                    <span className="text-[9px] text-gray-500 font-medium">{tf.desc.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Timeframe Chips on Desktop */}
        <div className="hidden lg:flex items-center space-x-1 bg-[#121620]/70 p-1 rounded-xl border border-white/5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono transition ${
                timeframe === tf.id
                  ? 'bg-[#222838] text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="w-[1px] h-4 bg-white/10" />

        {/* Indicators Menu */}
        <div className="relative">
          <button
            title="Technical Indicators"
            onClick={() => setShowIndicatorsMenu(!showIndicatorsMenu)}
            className={`p-2 rounded-xl flex items-center space-x-1.5 text-xs font-semibold transition ${
              indicators.sma || indicators.ema || indicators.bollinger
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Indicators</span>
          </button>

          {showIndicatorsMenu && (
            <div className="absolute bottom-10 left-0 w-52 bg-[#1a1f2e] border border-[#2e354b] rounded-2xl p-2 shadow-2xl z-50">
              <div className="text-[11px] font-bold text-gray-400 px-3 py-1.5 border-b border-[#2e354b]">
                OVERLAY INDICATORS
              </div>

              <button
                onClick={() => toggleIndicator('sma')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#222838] text-xs font-medium text-left transition"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-gray-200">SMA (Period 9)</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${indicators.sma ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500'}`}>
                  {indicators.sma ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() => toggleIndicator('ema')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#222838] text-xs font-medium text-left transition"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-gray-200">EMA (Period 21)</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${indicators.ema ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500'}`}>
                  {indicators.ema ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() => toggleIndicator('bollinger')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#222838] text-xs font-medium text-left transition"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-gray-200">Bollinger Bands (20, 2)</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${indicators.bollinger ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500'}`}>
                  {indicators.bollinger ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-white/10" />

        {/* Zoom Controls (Hidden on ultra-small mobile to prevent toolbar overflow) */}
        <div className="hidden sm:flex items-center space-x-1">
          <button
            title="Zoom In"
            onClick={() => handleZoom(0.8)}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-white rounded-xl transition"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            title="Zoom Out"
            onClick={() => handleZoom(1.2)}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-white rounded-xl transition"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            title="Reset View"
            onClick={handleResetZoom}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-white rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="hidden sm:block w-[1px] h-4 bg-white/10" />

        {/* Fullscreen (Desktop only) */}
        <button
          title="Toggle Fullscreen"
          onClick={toggleFullscreen}
          className="hidden sm:block p-2 text-gray-400 hover:text-white rounded-xl transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Chart Canvas */}
      <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
