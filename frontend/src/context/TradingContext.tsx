import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Asset, Candle, OrderDirection, Trade, UserAccount, WSClientAction, WSServerAction, Sentiment, LeaderboardTrader, CurrencyCode, TimeframeInterval, TIMEFRAME_SECONDS, Theme } from '../types';
import { sounds } from '../utils/audio';
import { formatCurrency } from '../utils/currency';
import { getWsUrl } from '../utils/api';

export interface ChartIndicators {
  sma: boolean;
  ema: boolean;
  bollinger: boolean;
}

interface TradingContextType {
  isConnected: boolean;
  account: UserAccount;
  assets: Asset[];
  selectedAsset: Asset | null;
  candles: Candle[];
  activeTrades: Trade[];
  tradeHistory: Trade[];
  currentPrice: number;
  sentiment: Sentiment | null;
  leaderboard: LeaderboardTrader[];
  isMuted: boolean;
  chartType: 'candlestick' | 'area';
  indicators: ChartIndicators;
  timeframe: TimeframeInterval;
  theme: Theme;
  notification: string | null;
  lastSettledResult: Trade | null;
  selectAsset: (assetId: string) => void;
  setTimeframe: (tf: TimeframeInterval) => void;
  toggleTheme: () => void;
  placeTrade: (direction: OrderDirection, amount: number, duration: number) => void;
  switchAccount: (type: 'DEMO' | 'REAL') => void;
  switchCurrency: (currency: CurrencyCode) => void;
  resetDemoBalance: () => void;
  depositFunds: (amount: number, promoCode?: string) => void;
  withdrawFunds: (amount: number, address: string) => void;
  toggleMute: () => void;
  setChartType: (type: 'candlestick' | 'area') => void;
  toggleIndicator: (indicator: keyof ChartIndicators) => void;
  closeSettledResult: () => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

const getSessionCurrency = (): CurrencyCode => {
  try {
    const session = sessionStorage.getItem('quotex_session_currency');
    if (session && ['INR', 'USD', 'EUR', 'GBP', 'BRL', 'IDR', 'JPY', 'NGN', 'TRY', 'AED', 'CAD', 'AUD'].includes(session)) {
      return session as CurrencyCode;
    }
  } catch {}
  return 'INR'; // Default currency is INR
};

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<UserAccount>({
    id: 'usr_quotex_vip_99',
    name: 'Alex Rivera',
    email: 'alex.rivera@quotex.pro',
    demoBalance: 10000.0,
    realBalance: 500.0,
    activeAccountType: 'DEMO',
    currency: getSessionCurrency(),
    vipLevel: 'VIP',
    isKycVerified: true,
    status: 'ACTIVE',
    totalTrades: 34,
    totalDepositedUSD: 1250.0,
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('EURUSD_OTC');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardTrader[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('quotex_muted') === 'true');
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [indicators, setIndicators] = useState<ChartIndicators>({
    sma: false,
    ema: false,
    bollinger: false,
  });
  const [timeframe, setTimeframeState] = useState<TimeframeInterval>('5s');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('quotex_theme') as Theme) || 'dark');
  const [notification, setNotification] = useState<string | null>(null);
  const [lastSettledResult, setLastSettledResult] = useState<Trade | null>(null);

  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const timeframeRef = useRef(timeframe);
  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const selectedAssetIdRef = useRef(selectedAssetId);
  useEffect(() => {
    selectedAssetIdRef.current = selectedAssetId;
  }, [selectedAssetId]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const wsRef = useRef<WebSocket | null>(null);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0] || null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('quotex_theme', next);
      return next;
    });
  };

  const setTimeframe = (tf: TimeframeInterval) => {
    // Immediately clear candles so the chart never shows stale candles
    // from the previous timeframe while CANDLES_HISTORY is in flight.
    setCandles([]);
    setTimeframeState(tf);
    timeframeRef.current = tf;
    const seconds = TIMEFRAME_SECONDS[tf] || 5;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SET_TIMEFRAME',
          timeframe: seconds,
          assetId: selectedAssetId,
        })
      );
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('quotex_muted', String(next));
      return next;
    });
  };

  const toggleIndicator = (ind: keyof ChartIndicators) => {
    setIndicators((prev) => ({ ...prev, [ind]: !prev[ind] }));
  };

  const closeSettledResult = () => {
    setLastSettledResult(null);
  };

  useEffect(() => {
    const wsUrl = getWsUrl();
    let socket: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        try {
          const savedUserRaw = localStorage.getItem('quotex_trader_user') || localStorage.getItem('quotex_current_user');
          if (savedUserRaw) {
            const savedUser = JSON.parse(savedUserRaw);
            if (savedUser && savedUser.id) {
              socket.send(JSON.stringify({ type: 'SYNC_USER', userId: savedUser.id }));
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onmessage = (event) => {
        try {
          const action = JSON.parse(event.data) as WSServerAction;

          switch (action.type) {
            case 'INIT_STATE': {
              let effectiveCurrency: CurrencyCode = 'INR';
              try {
                const sessionCurrency = sessionStorage.getItem('quotex_session_currency') as CurrencyCode | null;
                if (sessionCurrency) {
                  // User has active session currency in this tab: retain across page refreshes!
                  effectiveCurrency = sessionCurrency;
                } else {
                  // Reopened after tab was closed: reset to default currency (INR)
                  effectiveCurrency = (action.account.currency as CurrencyCode) || 'INR';
                }
              } catch {
                effectiveCurrency = (action.account.currency as CurrencyCode) || 'INR';
              }

              const mergedAccount = {
                ...action.account,
                currency: effectiveCurrency,
              };

              setAccount(mergedAccount);
              try {
                const savedUserRaw = localStorage.getItem('quotex_trader_user') || localStorage.getItem('quotex_current_user');
                if (savedUserRaw) {
                  const saved = JSON.parse(savedUserRaw);
                  const synced = { ...saved, ...mergedAccount };
                  localStorage.setItem('quotex_trader_user', JSON.stringify(synced));
                  localStorage.setItem('quotex_current_user', JSON.stringify(synced));
                }
              } catch (e) {}

              // If tab session currency differs from backend account currency, sync backend
              if (effectiveCurrency !== action.account.currency && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'SWITCH_CURRENCY', currency: effectiveCurrency }));
              }

              setAssets(action.assets);
              setActiveTrades(action.activeTrades);
              setTradeHistory(action.tradeHistory);
              if (action.leaderboard) setLeaderboard(action.leaderboard);
              const found = action.assets.find((a) => a.id === selectedAssetIdRef.current);
              if (found) setCurrentPrice(found.currentPrice);
              break;
            }

            case 'TICK':
              if (action.tick.assetId === selectedAssetIdRef.current) {
                setCurrentPrice(action.tick.price);
              }
              setAssets((prev) =>
                prev.map((a) => (a.id === action.tick.assetId ? { ...a, currentPrice: action.tick.price } : a))
              );
              break;

            case 'CANDLE_UPDATE': {
              const activeTfSec = TIMEFRAME_SECONDS[timeframeRef.current] || 5;
              // Accept the update only when the backend timeframe matches what the
              // client is currently set to. If action.timeframe is absent, only
              // accept for the default 5-second timeframe to avoid showing wrong
              // candle widths on other timeframes.
              const matchesTf = action.timeframe
                ? action.timeframe === activeTfSec
                : activeTfSec === 5;
              if (action.assetId === selectedAssetIdRef.current && matchesTf) {
                setCandles((prev) => {
                  if (prev.length === 0) return [action.candle];
                  const last = prev[prev.length - 1];
                  // Reject candle if its interval doesn't match the active
                  // timeframe (guards against stale updates arriving late)
                  if (prev.length >= 2) {
                    const secondLast = prev[prev.length - 2];
                    const candleWidth = last.time - secondLast.time;
                    if (candleWidth > 0 && Math.abs(candleWidth - activeTfSec) > 1) {
                      // History is from wrong timeframe — ignore until CANDLES_HISTORY arrives
                      return prev;
                    }
                  }
                  if (last.time === action.candle.time) {
                    return [...prev.slice(0, -1), action.candle];
                  } else if (action.candle.time > last.time) {
                    return [...prev, action.candle];
                  }
                  return prev;
                });
              }
              break;
            }

            case 'CANDLES_HISTORY':
              if (action.assetId === selectedAssetIdRef.current) {
                setCandles(action.candles);
                if (action.candles.length > 0) {
                  setCurrentPrice(action.candles[action.candles.length - 1].close);
                }
              }
              break;

            case 'SENTIMENT_UPDATE':
              if (action.sentiment.assetId === selectedAssetIdRef.current) {
                setSentiment(action.sentiment);
              }
              break;

            case 'LEADERBOARD_UPDATE':
              setLeaderboard(action.leaderboard);
              break;

            case 'TRADE_OPENED':
              if (!isMutedRef.current) sounds.playTradePlaced();
              setActiveTrades((prev) => [action.trade, ...prev]);
              setAccount((prev) => ({
                ...prev,
                demoBalance: (action.trade.accountType ?? prev.activeAccountType) === 'DEMO' ? action.newBalance : prev.demoBalance,
                realBalance: (action.trade.accountType ?? prev.activeAccountType) === 'REAL' ? action.newBalance : prev.realBalance,
              }));
              showNotification(`🚀 Order placed: ${action.trade.direction} ${formatCurrency(action.trade.amount, accountRef.current.currency)} on ${action.trade.assetId}`);
              break;

            case 'TRADE_SETTLED':
              setActiveTrades((prev) => prev.filter((t) => t.id !== action.trade.id));
              setTradeHistory((prev) => [action.trade, ...prev]);
              setAccount((prev) => ({
                ...prev,
                demoBalance: (action.trade.accountType ?? prev.activeAccountType) === 'DEMO' ? action.newBalance : prev.demoBalance,
                realBalance: (action.trade.accountType ?? prev.activeAccountType) === 'REAL' ? action.newBalance : prev.realBalance,
              }));
              setLastSettledResult(action.trade);

              if (action.trade.status === 'WON') {
                if (!isMutedRef.current) sounds.playTradeWon();
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#00c679', '#ffffff', '#ffd700'],
                });
                showNotification(`🎉 WON +${formatCurrency(action.trade.profit ?? 0, accountRef.current.currency)} on ${action.trade.assetId}!`);
              } else if (action.trade.status === 'TIE') {
                showNotification(`⚖️ Trade tied. Investment refunded.`);
              } else {
                if (!isMutedRef.current) sounds.playTradeLost();
                showNotification(`❌ Trade expired out-of-the-money (-${formatCurrency(action.trade.amount, accountRef.current.currency)})`);
              }
              break;

            case 'BALANCE_UPDATE':
              setAccount((prev) => {
                let currentSessionCurrency = prev.currency;
                try {
                  const sess = sessionStorage.getItem('quotex_session_currency') as CurrencyCode | null;
                  if (sess) currentSessionCurrency = sess;
                } catch {}

                const updated = {
                  ...prev,
                  demoBalance: action.demoBalance,
                  realBalance: action.realBalance,
                  activeAccountType: action.activeAccountType || prev.activeAccountType,
                  currency: currentSessionCurrency || action.currency || prev.currency || 'INR',
                };
                try {
                  const stored = localStorage.getItem('quotex_trader_user');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem('quotex_trader_user', JSON.stringify({ ...parsed, ...updated }));
                  }
                  const storedCur = localStorage.getItem('quotex_current_user');
                  if (storedCur) {
                    const parsed = JSON.parse(storedCur);
                    localStorage.setItem('quotex_current_user', JSON.stringify({ ...parsed, ...updated }));
                  }
                } catch {}
                return updated;
              });
              break;

            case 'ASSETS_UPDATE':
              setAssets(action.assets);
              break;

            case 'TRANSACTION_SUCCESS':
              setAccount((prev) => {
                const updated = {
                  ...prev,
                  demoBalance: action.demoBalance,
                  realBalance: action.realBalance,
                };
                try {
                  const stored = localStorage.getItem('quotex_trader_user');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem('quotex_trader_user', JSON.stringify({ ...parsed, ...updated }));
                  }
                  const storedCur = localStorage.getItem('quotex_current_user');
                  if (storedCur) {
                    const parsed = JSON.parse(storedCur);
                    localStorage.setItem('quotex_current_user', JSON.stringify({ ...parsed, ...updated }));
                  }
                } catch {}
                return updated;
              });
              showNotification(`💰 ${action.message}`);
              if (!isMuted) sounds.playTradeWon();
              break;

            case 'TRADE_DELETED':
              setActiveTrades((prev) => prev.filter((t) => t.id !== action.tradeId));
              setTradeHistory((prev) => prev.filter((t) => t.id !== action.tradeId));
              break;

            case 'USER_HISTORY_CLEARED':
              setTradeHistory([]);
              break;

            case 'ERROR':
              showNotification(`⚠️ ${action.message}`);
              break;
          }
        } catch (e) {
          console.error('Error handling WS event', e);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, []); // Maintain permanent connection; never tear down on asset switch!

  const selectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    selectedAssetIdRef.current = assetId;

    // Clear stale candles immediately so the chart doesn't flash the previous asset's candles
    setCandles([]);

    // Immediately update price and sentiment for responsive instant feedback
    const found = assets.find((a) => a.id === assetId);
    if (found) {
      setCurrentPrice(found.currentPrice);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = {
        type: 'SUBSCRIBE_ASSET',
        assetId,
        timeframe: TIMEFRAME_SECONDS[timeframeRef.current] || 5,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const placeTrade = (direction: OrderDirection, amount: number, duration: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showNotification('Cannot place trade: not connected to trading server.');
      return;
    }
    const currentAssetId = selectedAssetIdRef.current || selectedAssetId;
    const msg: WSClientAction = {
      type: 'PLACE_TRADE',
      assetId: currentAssetId,
      direction,
      amount: Number(amount.toFixed(4)),
      duration,
    };
    wsRef.current.send(JSON.stringify(msg));
  };

  const switchAccount = (accountType: 'DEMO' | 'REAL') => {
    setAccount((prev) => ({ ...prev, activeAccountType: accountType }));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = { type: 'SWITCH_ACCOUNT', accountType };
      wsRef.current.send(JSON.stringify(msg));
    }
    showNotification(`Switched to ${accountType === 'DEMO' ? 'Demo Practice' : 'Live Real'} Account`);
  };

  const switchCurrency = (currency: CurrencyCode) => {
    try {
      sessionStorage.setItem('quotex_session_currency', currency);
    } catch {}
    setAccount((prev) => ({ ...prev, currency }));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = { type: 'SWITCH_CURRENCY', currency };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const resetDemoBalance = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = { type: 'RESET_DEMO_BALANCE' };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const depositFunds = (amount: number, promoCode?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = { type: 'DEPOSIT_FUNDS', amount, promoCode };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const withdrawFunds = (amount: number, address: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = { type: 'WITHDRAW_FUNDS', amount, address };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return (
    <TradingContext.Provider
      value={{
        isConnected,
        account,
        assets,
        selectedAsset,
        candles,
        activeTrades,
        tradeHistory,
        currentPrice,
        sentiment,
        leaderboard,
        isMuted,
        chartType,
        indicators,
        timeframe,
        theme,
        notification,
        lastSettledResult,
        selectAsset,
        setTimeframe,
        toggleTheme,
        placeTrade,
        switchAccount,
        switchCurrency,
        resetDemoBalance,
        depositFunds,
        withdrawFunds,
        toggleMute,
        setChartType,
        toggleIndicator,
        closeSettledResult,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within TradingProvider');
  return context;
};
