import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class BinanceFeed extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  public start() {
    this.connect();
  }

  private connect() {
    try {
      // Extended Binance multi-stream klines 1s for all major cryptos
      const streams = [
        'btcusdt@kline_1s',
        'ethusdt@kline_1s',
        'solusdt@kline_1s',
        'bnbusdt@kline_1s',
        'dogeusdt@kline_1s',
        'xrpusdt@kline_1s',
        'adausdt@kline_1s',
        'avaxusdt@kline_1s',
      ].join('/');

      const streamUrl = `wss://stream.binance.com:9443/ws/${streams}`;
      this.ws = new WebSocket(streamUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        console.log('✅ Connected to Binance Live Multi-Crypto Market Stream');
      });

      this.ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.k) {
            const k = parsed.k;
            const symbol = parsed.s; // e.g. 'BTCUSDT', 'DOGEUSDT'
            const closePrice = parseFloat(k.c);
            const highPrice = parseFloat(k.h);
            const lowPrice = parseFloat(k.l);
            const openPrice = parseFloat(k.o);

            this.emit('price', {
              assetId: symbol,
              price: closePrice,
              open: openPrice,
              high: highPrice,
              low: lowPrice,
              time: Math.floor(k.t / 1000),
            });
          }
        } catch {
          // ignore malformed packets
        }
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.ws.on('error', () => {
        this.isConnected = false;
        if (this.ws) this.ws.close();
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  public getConnected(): boolean {
    return this.isConnected;
  }
}
