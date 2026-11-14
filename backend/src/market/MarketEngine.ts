import { EventEmitter } from 'events';
import { Asset, Candle, Tick, Sentiment } from '../types.js';
import { BinanceFeed } from './BinanceFeed.js';

export const SUPPORTED_TIMEFRAMES = [5, 15, 30, 60, 300, 600, 3600, 18000];

interface AssetState {
  asset: Asset;
  candles: Candle[];
  currentCandle: Candle;
  timeframeCandles: Map<number, Candle[]>;
  timeframeCurrentCandle: Map<number, Candle>;
  volatility: number;
  sentiment: Sentiment;
}

function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getAssetSeed(assetId: string, timeframe: number): number {
  let hash = 0;
  for (let i = 0; i < assetId.length; i++) {
    hash = (hash << 5) - hash + assetId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash * 31 + timeframe);
}

export class MarketEngine extends EventEmitter {
  private assets: Map<string, AssetState> = new Map();
  private intervalTimer: NodeJS.Timeout | null = null;
  private sentimentTimer: NodeJS.Timeout | null = null;
  private readonly candleIntervalSeconds = 5;
  private binanceFeed: BinanceFeed;

  constructor() {
    super();
    this.binanceFeed = new BinanceFeed();
    this.initializeAssets();
    this.setupBinanceIntegration();
  }

  private initializeAssets() {
    const assetConfigs: Array<{
      id: string;
      name: string;
      category: 'crypto' | 'forex' | 'commodities' | 'indices';
      payout: number;
      basePrice: number;
      decimalPlaces: number;
      volatility: number;
      isRealFeed?: boolean;
    }> = [
      // Major Crypto (Live Binance Stream)
      { id: 'BTCUSDT', name: 'Bitcoin (BTC/USDT)', category: 'crypto', payout: 93, basePrice: 69500.00, decimalPlaces: 2, volatility: 22.0, isRealFeed: true },
      { id: 'ETHUSDT', name: 'Ethereum (ETH/USDT)', category: 'crypto', payout: 90, basePrice: 2545.00, decimalPlaces: 2, volatility: 1.4, isRealFeed: true },
      { id: 'SOLUSDT', name: 'Solana (SOL/USDT)', category: 'crypto', payout: 89, basePrice: 179.20, decimalPlaces: 2, volatility: 0.28, isRealFeed: true },
      { id: 'BNBUSDT', name: 'BNB (BNB/USDT)', category: 'crypto', payout: 88, basePrice: 585.50, decimalPlaces: 2, volatility: 0.45, isRealFeed: true },
      { id: 'DOGEUSDT', name: 'Dogecoin (DOGE/USDT)', category: 'crypto', payout: 87, basePrice: 0.1652, decimalPlaces: 4, volatility: 0.0008, isRealFeed: true },
      { id: 'XRPUSDT', name: 'Ripple (XRP/USDT)', category: 'crypto', payout: 87, basePrice: 0.5280, decimalPlaces: 4, volatility: 0.0015, isRealFeed: true },
      { id: 'ADAUSDT', name: 'Cardano (ADA/USDT)', category: 'crypto', payout: 86, basePrice: 0.3540, decimalPlaces: 4, volatility: 0.0012, isRealFeed: true },
      { id: 'AVAXUSDT', name: 'Avalanche (AVAX/USDT)', category: 'crypto', payout: 86, basePrice: 26.80, decimalPlaces: 2, volatility: 0.08, isRealFeed: true },

      // Forex OTC Pairs
      { id: 'EURUSD_OTC', name: 'EUR/USD (OTC)', category: 'forex', payout: 94, basePrice: 1.08640, decimalPlaces: 5, volatility: 0.00015 },
      { id: 'GBPUSD_OTC', name: 'GBP/USD (OTC)', category: 'forex', payout: 91, basePrice: 1.29820, decimalPlaces: 5, volatility: 0.00018 },
      { id: 'USDJPY_OTC', name: 'USD/JPY (OTC)', category: 'forex', payout: 88, basePrice: 153.250, decimalPlaces: 3, volatility: 0.035 },
      { id: 'AUDUSD_OTC', name: 'AUD/USD (OTC)', category: 'forex', payout: 87, basePrice: 0.65800, decimalPlaces: 5, volatility: 0.00014 },
      { id: 'USDCAD_OTC', name: 'USD/CAD (OTC)', category: 'forex', payout: 86, basePrice: 1.39200, decimalPlaces: 5, volatility: 0.00016 },
      { id: 'USDCHF_OTC', name: 'USD/CHF (OTC)', category: 'forex', payout: 85, basePrice: 0.86700, decimalPlaces: 5, volatility: 0.00013 },
      { id: 'EURJPY_OTC', name: 'EUR/JPY (OTC)', category: 'forex', payout: 89, basePrice: 166.450, decimalPlaces: 3, volatility: 0.038 },
      { id: 'GBPJPY_OTC', name: 'GBP/JPY (OTC)', category: 'forex', payout: 92, basePrice: 198.900, decimalPlaces: 3, volatility: 0.045 },
      { id: 'NZDUSD_OTC', name: 'NZD/USD (OTC)', category: 'forex', payout: 84, basePrice: 0.59600, decimalPlaces: 5, volatility: 0.00015 },

      // Commodities
      { id: 'GOLD_OTC', name: 'Gold XAU/USD (OTC)', category: 'commodities', payout: 91, basePrice: 2748.80, decimalPlaces: 2, volatility: 0.65 },
      { id: 'SILVER_OTC', name: 'Silver XAG/USD (OTC)', category: 'commodities', payout: 84, basePrice: 33.65, decimalPlaces: 2, volatility: 0.03 },
      { id: 'BRENT_OTC', name: 'Crude Oil Brent (OTC)', category: 'commodities', payout: 85, basePrice: 73.20, decimalPlaces: 2, volatility: 0.06 },

      // Stock Market Indices
      { id: 'US30_OTC', name: 'Wall Street 30 / Dow (OTC)', category: 'indices', payout: 88, basePrice: 42150.0, decimalPlaces: 1, volatility: 8.5 },
      { id: 'SPX500_OTC', name: 'US 500 / S&P 500 (OTC)', category: 'indices', payout: 87, basePrice: 5740.0, decimalPlaces: 1, volatility: 1.2 },
      { id: 'NAS100_OTC', name: 'US Tech 100 / NASDAQ (OTC)', category: 'indices', payout: 89, basePrice: 20120.0, decimalPlaces: 1, volatility: 4.8 },
    ];

    const nowSeconds = Math.floor(Date.now() / 1000);

    for (const config of assetConfigs) {
      const timeframeCandles = new Map<number, Candle[]>();
      const timeframeCurrentCandle = new Map<number, Candle>();

      // Generate realistic deterministic candle histories for all supported timeframes
      for (const tf of SUPPORTED_TIMEFRAMES) {
        const intervalTime = nowSeconds - (nowSeconds % tf);
        const rng = createSeededRandom(getAssetSeed(config.id, tf));
        const volScale = Math.min(5, Math.sqrt(tf / 5));
        const vol = config.volatility * volScale;
        const dec = config.decimalPlaces;
        const count = 120;

        const candles: Candle[] = [];
        let runningPrice = config.basePrice;
        const historyStart = intervalTime - (count * tf);

        for (let i = 0; i < count; i++) {
          const cTime = historyStart + (i * tf);
          const delta = (rng() - 0.495) * vol * 2;
          const open = Number(runningPrice.toFixed(dec));
          const close = Number(Math.max(0.0001, runningPrice + delta).toFixed(dec));
          const wickRange = vol * 0.8;
          const high = Number(Math.max(open, close, Math.max(open, close) + rng() * wickRange).toFixed(dec));
          const low = Number(Math.max(0.0001, Math.min(open, close) - rng() * wickRange).toFixed(dec));

          candles.push({ time: cTime, open, high, low, close });
          runningPrice = close;
        }

        const lastCandle = candles[candles.length - 1];
        const currentCandle: Candle = {
          time: intervalTime,
          open: lastCandle.close,
          high: lastCandle.close,
          low: lastCandle.close,
          close: lastCandle.close,
        };

        timeframeCandles.set(tf, candles);
        timeframeCurrentCandle.set(tf, currentCandle);
      }

      const baseCandles = timeframeCandles.get(5) || [];
      const baseCurrent = timeframeCurrentCandle.get(5)!;

      const asset: Asset = {
        id: config.id,
        name: config.name,
        category: config.category,
        payout: config.payout,
        currentPrice: baseCurrent.close,
        decimalPlaces: config.decimalPlaces,
        change24h: +(Math.random() * 3 - 1.2).toFixed(2),
        isRealFeed: config.isRealFeed,
      };

      const bull = Math.floor(52 + Math.random() * 25);
      const sentiment: Sentiment = {
        assetId: config.id,
        bullPercent: bull,
        bearPercent: 100 - bull,
      };

      this.assets.set(config.id, {
        asset,
        candles: baseCandles,
        currentCandle: baseCurrent,
        timeframeCandles,
        timeframeCurrentCandle,
        volatility: config.volatility,
        sentiment,
      });
    }
  }

  private applyTick(state: AssetState, price: number, nowSeconds: number) {
    state.asset.currentPrice = price;

    for (const tf of SUPPORTED_TIMEFRAMES) {
      const currentIntervalTime = nowSeconds - (nowSeconds % tf);
      const curr = state.timeframeCurrentCandle.get(tf);
      const history = state.timeframeCandles.get(tf);
      if (!curr || !history) continue;

      if (currentIntervalTime > curr.time) {
        history.push({ ...curr });
        if (history.length > 300) history.shift();

        state.timeframeCurrentCandle.set(tf, {
          time: currentIntervalTime,
          open: price,
          high: price,
          low: price,
          close: price,
        });
      } else {
        curr.close = price;
        if (price > curr.high) curr.high = price;
        if (price < curr.low) curr.low = price;
      }
    }

    // Keep primary 5s references in sync
    const base5s = state.timeframeCurrentCandle.get(5);
    if (base5s) {
      state.currentCandle = base5s;
      state.candles = state.timeframeCandles.get(5) || [];
    }
  }

  private setupBinanceIntegration() {
    this.binanceFeed.on('price', (data: { assetId: string; price: number; open: number; high: number; low: number; time: number }) => {
      const state = this.assets.get(data.assetId);
      if (!state) return;

      const dec = state.asset.decimalPlaces;
      const formattedPrice = Number(data.price.toFixed(dec));
      state.asset.isRealFeed = true;

      const nowSeconds = Math.floor(Date.now() / 1000);
      this.applyTick(state, formattedPrice, nowSeconds);

      this.emit('tick', {
        assetId: state.asset.id,
        price: formattedPrice,
        time: nowSeconds,
      });
      this.emit('candle_update', { assetId: state.asset.id, candle: { ...state.currentCandle } });
    });
  }

  public start() {
    this.binanceFeed.start();

    if (!this.intervalTimer) {
      this.intervalTimer = setInterval(() => {
        this.generateTicks();
      }, 500);
    }

    if (!this.sentimentTimer) {
      this.sentimentTimer = setInterval(() => {
        this.updateSentiments();
      }, 2500);
    }
  }

  private updateSentiments() {
    for (const state of this.assets.values()) {
      const shift = Math.floor(Math.random() * 5) - 2;
      let newBull = Math.max(35, Math.min(85, state.sentiment.bullPercent + shift));
      state.sentiment.bullPercent = newBull;
      state.sentiment.bearPercent = 100 - newBull;
      this.emit('sentiment_update', state.sentiment);
    }
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.sentimentTimer) {
      clearInterval(this.sentimentTimer);
      this.sentimentTimer = null;
    }
  }

  private generateTicks() {
    const nowSeconds = Math.floor(Date.now() / 1000);

    for (const state of this.assets.values()) {
      if (state.asset.isRealFeed && this.binanceFeed.getConnected()) {
        continue;
      }

      const { asset, volatility } = state;
      const dec = asset.decimalPlaces;

      const delta = (Math.random() - 0.498) * volatility * 0.7;
      const newPrice = Number(Math.max(0.0001, asset.currentPrice + delta).toFixed(dec));

      this.applyTick(state, newPrice, nowSeconds);

      const tick: Tick = {
        assetId: asset.id,
        price: newPrice,
        time: nowSeconds,
      };

      this.emit('tick', tick);
      this.emit('candle_update', { assetId: asset.id, candle: { ...state.currentCandle } });
    }
  }

  public getAssets(): Asset[] {
    return Array.from(this.assets.values()).map(s => ({ ...s.asset }));
  }

  public getAsset(id: string): Asset | undefined {
    return this.assets.get(id)?.asset;
  }

  public getCandles(assetId: string, timeframeSeconds: number = 5): Candle[] {
    const state = this.assets.get(assetId);
    if (!state) return [];

    let tf = timeframeSeconds;
    if (!state.timeframeCandles.has(tf)) {
      tf = SUPPORTED_TIMEFRAMES.reduce((prev, curr) =>
        Math.abs(curr - timeframeSeconds) < Math.abs(prev - timeframeSeconds) ? curr : prev
      );
    }

    const history = state.timeframeCandles.get(tf) || [];
    const curr = state.timeframeCurrentCandle.get(tf);

    return curr ? [...history, { ...curr }] : [...history];
  }

  public getCurrentCandle(assetId: string, timeframeSeconds: number = 5): Candle | undefined {
    const state = this.assets.get(assetId);
    if (!state) return undefined;

    let tf = timeframeSeconds;
    if (!state.timeframeCurrentCandle.has(tf)) {
      tf = SUPPORTED_TIMEFRAMES.reduce((prev, curr) =>
        Math.abs(curr - timeframeSeconds) < Math.abs(prev - timeframeSeconds) ? curr : prev
      );
    }

    const curr = state.timeframeCurrentCandle.get(tf);
    return curr ? { ...curr } : undefined;
  }

  public getSentiment(assetId: string): Sentiment | undefined {
    return this.assets.get(assetId)?.sentiment;
  }

  public setAssetPayout(assetId: string, payout: number): boolean {
    const state = this.assets.get(assetId);
    if (!state) return false;
    state.asset.payout = Math.max(10, Math.min(99, Math.round(payout)));
    this.emit('payout_updated', { assetId, payout: state.asset.payout });
    return true;
  }

  public setExactAssetPrice(assetId: string, exactPrice: number): number {
    const state = this.assets.get(assetId);
    if (!state) return exactPrice;

    const dec = state.asset.decimalPlaces;
    const formattedPrice = Number(exactPrice.toFixed(dec));
    const nowSeconds = Math.floor(Date.now() / 1000);

    this.applyTick(state, formattedPrice, nowSeconds);

    const tick: Tick = {
      assetId: state.asset.id,
      price: formattedPrice,
      time: nowSeconds,
    };

    this.emit('tick', tick);
    this.emit('candle_update', { assetId: state.asset.id, candle: { ...state.currentCandle } });
    return formattedPrice;
  }
}
