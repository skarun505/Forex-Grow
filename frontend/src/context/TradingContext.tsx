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

/**
 * Automatic VIP Tier calculation based on real funds:
 * STANDARD: below 1 Lakh INR (< 100,000 / < $1,200)
 * PRO: 1 Lakh to 5 Lakh INR (100,000 - 499,999.99 / $1,200 - $5,999.99)
 * VIP: 5 Lakh INR and above (>= 500,000 / >= $6,000)
 */
export const calculateVipLevel = (realBalance: number, currency: string = 'INR'): 'STANDARD' | 'PRO' | 'VIP' => {
  const isUsd = currency === 'USD';
  const proThreshold = isUsd ? 1200 : 100000;
  const vipThreshold = isUsd ? 6000 : 500000;

  if (realBalance >= vipThreshold) return 'VIP';
  if (realBalance >= proThreshold) return 'PRO';
  return 'STANDARD';
};

const getSessionCurrency = (): CurrencyCode => {
  try {
    const session = sessionStorage.getItem('quotex_session_currency');
    if (session && ['INR', 'USD', 'EUR', 'GBP', 'BRL', 'IDR', 'JPY', 'NGN', 'TRY', 'AED', 'CAD', 'AUD'].includes(session)) {
      return session as CurrencyCode;
    }
  } catch {}
  return 'INR'; // Default currency is INR
};

const getSessionAsset = (): string => {
  try {
    const session = sessionStorage.getItem('quotex_session_asset');
    if (session) return session;
  } catch {}
  return 'EURUSD_OTC';
};

const getSessionTimeframe = (): TimeframeInterval => {
  try {
    const session = sessionStorage.getItem('quotex_session_timeframe');
    if (session && ['5s', '15s', '30s', '1m', '5m', '15m', '30m', '1h', '1d'].includes(session)) {
      return session as TimeframeInterval;
    }
  } catch {}
  return '5s';
};

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem('quotex_trader_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role === 'TRADER') {
          return {
            ...parsed,
            demoBalance: parsed.demoBalance ?? 700000.0,
            currency: getSessionCurrency() || parsed.currency || 'INR',
          };
        }
      }
    } catch {}
    return {
      id: '',
      name: 'Trader',
      email: '',
      demoBalance: 700000.0,
      realBalance: 0.0,
      activeAccountType: 'DEMO',
      currency: getSessionCurrency(),
      vipLevel: 'STANDARD',
      isKycVerified: false,
      status: 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: 0.0,
    };
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(getSessionAsset);
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
  const [timeframe, setTimeframeState] = useState<TimeframeInterval>(getSessionTimeframe);
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
    try {
      sessionStorage.setItem('quotex_session_timeframe', tf);
    } catch {}
    const seconds = TIMEFRAME_SECONDS[tf] || 5;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SET_TIMEFRAME',
          timeframe: seconds,
          assetId: selectedAssetIdRef.current || selectedAssetId,
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
    let socket: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      let userId = '';
      let tabToken = '';
      const isAdminPortal = window.location.pathname.startsWith('/admin');
      const isManagerPortal = window.location.pathname.startsWith('/manager');

      if (isAdminPortal) {
        try {
          const adminRaw = localStorage.getItem('quotex_admin_user');
          if (adminRaw) {
            const parsed = JSON.parse(adminRaw);
            userId = parsed?.id || '';
          }
        } catch {}
        tabToken =
          sessionStorage.getItem('forexgrow_admin_tab_token') ||
          localStorage.getItem('forexgrow_admin_token') ||
          sessionStorage.getItem('forexgrow_tab_token') ||
          localStorage.getItem('forexgrow_auth_token') ||
          '';
      } else if (isManagerPortal) {
        try {
          const mgrRaw = localStorage.getItem('quotex_manager_user');
          if (mgrRaw) {
            const parsed = JSON.parse(mgrRaw);
            userId = parsed?.id || '';
          }
        } catch {}
        tabToken =
          sessionStorage.getItem('forexgrow_manager_tab_token') ||
          localStorage.getItem('forexgrow_manager_token') ||
          sessionStorage.getItem('forexgrow_tab_token') ||
          localStorage.getItem('forexgrow_auth_token') ||
          '';
      } else {
        try {
          const savedUserRaw = localStorage.getItem('quotex_trader_user');
          if (savedUserRaw) {
            const parsed = JSON.parse(savedUserRaw);
            if (parsed?.id && parsed.role === 'TRADER') userId = parsed.id;
          }
        } catch (e) {}
        tabToken =
          sessionStorage.getItem('forexgrow_tab_token') ||
          localStorage.getItem('forexgrow_trader_token') ||
          localStorage.getItem('forexgrow_auth_token') ||
          '';
      }

      const baseWsUrl = getWsUrl();
      const delim = baseWsUrl.includes('?') ? '&' : '?';
      const authenticatedWsUrl = `${baseWsUrl}${delim}userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(tabToken)}`;

      socket = new WebSocket(authenticatedWsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);

        if (tabToken || userId) {
          socket.send(JSON.stringify({
            type: 'CLIENT_AUTH',
            token: tabToken,
            userId,
          }));
        }

        const activeAsset = selectedAssetIdRef.current || getSessionAsset();
        const activeTf = typeof timeframeRef.current === 'number'
          ? timeframeRef.current
          : (TIMEFRAME_SECONDS[timeframeRef.current as TimeframeInterval] || 5);

        socket.send(JSON.stringify({
          type: 'SUBSCRIBE_ASSET',
          assetId: activeAsset,
          timeframe: activeTf,
        }));

        try {
          const savedUserRaw = localStorage.getItem('quotex_trader_user');
          if (savedUserRaw) {
            const savedUser = JSON.parse(savedUserRaw);
            if (savedUser && savedUser.id && savedUser.role === 'TRADER') {
              if (savedUser.demoBalance === 10000 || !savedUser.demoBalance) {
                savedUser.demoBalance = 700000.0;
                setAccount((prev) => ({ ...prev, demoBalance: 700000.0 }));
                localStorage.setItem('quotex_trader_user', JSON.stringify(savedUser));
              }
              socket.send(JSON.stringify({ type: 'SYNC_USER', userId: savedUser.id }));
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      socket.onclose = (event) => {
        setIsConnected(false);

        // Code 4001: Server-enforced eviction when 3rd device signs into same trader account
        if (event.code === 4001) {
          const reason = 'Account session terminated: Device limit (max 2 devices) reached. Another device signed into this trading account.';
          sessionStorage.setItem('quotex_forced_logout_reason', reason);
          localStorage.removeItem('quotex_trader_user');
          localStorage.removeItem('quotex_current_user');
          localStorage.removeItem('forexgrow_auth_token');
          sessionStorage.removeItem('forexgrow_tab_token');
          window.location.href = '/login';
          return;
        }

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
                vipLevel: calculateVipLevel(action.account.realBalance, effectiveCurrency),
              };

              // Only sync state if account is valid
              if (action.account && action.account.id) {
                let savedTraderId = '';
                try {
                  const s = localStorage.getItem('quotex_trader_user');
                  if (s) {
                    const parsed = JSON.parse(s);
                    savedTraderId = parsed?.id || '';
                  }
                } catch {}

                // If currently authenticated as a trader, discard mismatched or staff accounts on trading floor
                if (savedTraderId && action.account.id !== savedTraderId) {
                  break;
                }
                if (action.account.role && action.account.role !== 'TRADER') {
                  break;
                }

                setAccount(mergedAccount);
                try {
                  const savedUserRaw = localStorage.getItem('quotex_trader_user');
                  if (savedUserRaw) {
                    const saved = JSON.parse(savedUserRaw);
                    if (saved && saved.id === action.account.id) {
                      const synced = { ...saved, ...mergedAccount };
                      localStorage.setItem('quotex_trader_user', JSON.stringify(synced));
                      localStorage.setItem('quotex_current_user', JSON.stringify(synced));
                    }
                  }
                } catch (e) {}
              }

              // If tab session currency differs from backend account currency, sync backend
              if (effectiveCurrency !== action.account.currency && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'SWITCH_CURRENCY', currency: effectiveCurrency }));
              }

              setAssets(Array.isArray(action.assets) ? action.assets : []);
              setActiveTrades(Array.isArray(action.activeTrades) ? action.activeTrades : []);
              setTradeHistory(Array.isArray(action.tradeHistory) ? action.tradeHistory : []);
              if (action.leaderboard) setLeaderboard(Array.isArray(action.leaderboard) ? action.leaderboard : []);
              const found = Array.isArray(action.assets) ? action.assets.find((a) => a.id === selectedAssetIdRef.current) : null;
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
              if (action.trade?.userId && accountRef.current.id && action.trade.userId !== accountRef.current.id) {
                break;
              }
              if (!isMutedRef.current) sounds.playTradePlaced();
              setActiveTrades((prev) => [action.trade, ...(Array.isArray(prev) ? prev : [])]);
              setAccount((prev) => ({
                ...prev,
                demoBalance: (action.trade.accountType ?? prev.activeAccountType) === 'DEMO' ? action.newBalance : prev.demoBalance,
                realBalance: (action.trade.accountType ?? prev.activeAccountType) === 'REAL' ? action.newBalance : prev.realBalance,
              }));
              showNotification(`🚀 Order placed: ${action.trade.direction} ${formatCurrency(action.trade.amount, accountRef.current.currency)} on ${action.trade.assetId}`);
              break;

            case 'TRADE_SETTLED':
              if (action.trade?.userId && accountRef.current.id && action.trade.userId !== accountRef.current.id) {
                break;
              }
              setActiveTrades((prev) => (Array.isArray(prev) ? prev.filter((t) => t.id !== action.trade.id) : []));
              setTradeHistory((prev) => [action.trade, ...(Array.isArray(prev) ? prev : [])]);
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
                if (action.userId && prev.id && action.userId !== prev.id) {
                  return prev;
                }

                let currentSessionCurrency = prev.currency;
                try {
                  const sess = sessionStorage.getItem('quotex_session_currency') as CurrencyCode | null;
                  if (sess) currentSessionCurrency = sess;
                } catch {}

                const effCurr = currentSessionCurrency || action.currency || prev.currency || 'INR';
                const effVip = calculateVipLevel(action.realBalance, effCurr);

                const updated = {
                  ...prev,
                  demoBalance: action.demoBalance,
                  realBalance: action.realBalance,
                  activeAccountType: action.activeAccountType || prev.activeAccountType,
                  currency: effCurr,
                  vipLevel: effVip,
                  isKycVerified: action.isKycVerified !== undefined ? action.isKycVerified : prev.isKycVerified,
                  kycStatus: action.kycStatus !== undefined ? action.kycStatus : (action.isKycVerified === false ? 'NOT_SUBMITTED' : prev.kycStatus),
                  kycData: action.isKycVerified === false ? undefined : prev.kycData,
                  aadhaarNumber: action.isKycVerified === false ? undefined : prev.aadhaarNumber,
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
              if (action.userId && accountRef.current.id && action.userId !== accountRef.current.id) {
                break;
              }
              setAccount((prev) => {
                const updated = {
                  ...prev,
                  demoBalance: action.demoBalance,
                  realBalance: action.realBalance,
                  vipLevel: calculateVipLevel(action.realBalance, prev.currency),
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
              setActiveTrades((prev) => (Array.isArray(prev) ? prev.filter((t) => t.id !== action.tradeId) : []));
              setTradeHistory((prev) => (Array.isArray(prev) ? prev.filter((t) => t.id !== action.tradeId) : []));
              break;

            case 'USER_HISTORY_CLEARED':
              setTradeHistory([]);
              break;

            case 'FORCE_LOGOUT': {
              const targetRole = action.targetRole || 'TRADER';
              const pathname = window.location.pathname;
              const isAdminDesk = pathname.startsWith('/admin');
              const isManagerDesk = pathname.startsWith('/manager');

              // If this eviction targets TRADERS, do NOT touch Admin or Manager sessions
              if (targetRole === 'TRADER' && (isAdminDesk || isManagerDesk)) {
                console.log('[AUTH] Admin/Manager session retained. Trader eviction ignored on desk route:', pathname);
                break;
              }

              // Verify if this window has an active staff session
              try {
                if (targetRole === 'TRADER') {
                  const hasAdmin = !!localStorage.getItem('quotex_admin_user');
                  const hasManager = !!localStorage.getItem('quotex_manager_user');
                  if ((isAdminDesk && hasAdmin) || (isManagerDesk && hasManager)) {
                    console.log('[AUTH] Active administrative session protected from trader logout.');
                    break;
                  }
                }
              } catch {}

              // Account-specific device validation: check if this logout targets our account
              let currentTraderId = '';
              try {
                const storedTraderStr = localStorage.getItem('quotex_trader_user') || localStorage.getItem('quotex_current_user');
                if (storedTraderStr) {
                  const parsed = JSON.parse(storedTraderStr);
                  currentTraderId = parsed?.id || '';
                }
              } catch {}

              // If this tab has no trader session or does not match the target trader, do NOT logout!
              if (!currentTraderId || (action.targetUserId && currentTraderId !== action.targetUserId)) {
                break;
              }

              // If this tab is the device that just signed in, ignore the eviction
              if (action.exceptToken) {
                try {
                  const myTabToken = sessionStorage.getItem('forexgrow_tab_token') || localStorage.getItem('forexgrow_trader_token');
                  if (myTabToken && myTabToken === action.exceptToken) {
                    break;
                  }
                } catch {}
              }

              const reason = action.reason || 'Account device limit (max 2 devices) reached. A new device signed in, terminating previous sessions.';
              showNotification(`⚠️ ${reason}`);
              try {
                sessionStorage.setItem('quotex_forced_logout_reason', reason);
                // Purge TRADER credentials only - Admin and Manager credentials remain completely intact!
                localStorage.removeItem('quotex_trader_user');
                localStorage.removeItem('quotex_current_user');
                localStorage.removeItem('forexgrow_trader_token');
                localStorage.removeItem('forexgrow_auth_token');
                sessionStorage.removeItem('forexgrow_tab_token');
              } catch {}
              setTimeout(() => {
                window.location.href = '/login';
              }, 1200);
              break;
            }

            case 'SESSION_CONCURRENCY_UPDATE':
              window.dispatchEvent(new CustomEvent('session_concurrency_update', {
                detail: { activeCount: action.activeCount, maxLimit: action.maxLimit }
              }));
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
    try {
      sessionStorage.setItem('quotex_session_asset', assetId);
    } catch {}

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
        timeframe: typeof timeframeRef.current === 'number'
          ? timeframeRef.current
          : (TIMEFRAME_SECONDS[timeframeRef.current as TimeframeInterval] || 5),
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const placeTrade = (direction: OrderDirection, amount: number, duration: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showNotification('Cannot place trade: not connected to trading server.');
      return;
    }

    // Daily Loss Limit Protection Guard for Live REAL Account
    if (account.activeAccountType === 'REAL') {
      try {
        const isLimitEnabled = localStorage.getItem('forexgrow_daily_limit_enabled_' + account.id) === 'true';
        const limitAmt = Number(localStorage.getItem('forexgrow_daily_limit_' + account.id)) || 0;
        if (isLimitEnabled && limitAmt > 0) {
          const todayStart = new Date().setHours(0, 0, 0, 0);
          const todayTrades = (Array.isArray(tradeHistory) ? tradeHistory : []).filter((t) => t.openTime >= todayStart && t.accountType === 'REAL');
          let netLossToday = 0;
          for (const t of todayTrades) {
            if (t.status === 'LOST') {
              netLossToday += t.amount;
            } else if (t.status === 'WON') {
              netLossToday -= ((t.amount * (t.payout / 100)));
            }
          }
          if (netLossToday >= limitAmt) {
            showNotification(`🛡️ Daily Limit Hit: Today's net loss reached ${formatCurrency(limitAmt, account.currency)}. Trading is paused to protect your funds.`);
            return;
          }
        }
      } catch {}
    }

    const currentAssetId = selectedAssetIdRef.current || selectedAssetId;
    const effectiveUserId = accountRef.current.id || account.id;
    const msg: WSClientAction = {
      type: 'PLACE_TRADE',
      assetId: currentAssetId,
      direction,
      amount: Number(amount.toFixed(4)),
      duration,
      userId: effectiveUserId,
    };
    wsRef.current.send(JSON.stringify(msg));
  };

  const switchAccount = (accountType: 'DEMO' | 'REAL') => {
    setAccount((prev) => ({ ...prev, activeAccountType: accountType }));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = {
        type: 'SWITCH_ACCOUNT',
        accountType,
        userId: accountRef.current.id || account.id,
      };
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
      const msg: WSClientAction = {
        type: 'SWITCH_CURRENCY',
        currency,
        userId: accountRef.current.id || account.id,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const resetDemoBalance = () => {
    setAccount((prev) => {
      const updated = { ...prev, demoBalance: 700000.0 };
      try {
        const stored = localStorage.getItem('quotex_trader_user');
        if (stored) {
          const p = JSON.parse(stored);
          localStorage.setItem('quotex_trader_user', JSON.stringify({ ...p, demoBalance: 700000.0 }));
        }
      } catch (e) {}
      return updated;
    });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = {
        type: 'RESET_DEMO_BALANCE',
        userId: accountRef.current.id || account.id,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const depositFunds = (amount: number, promoCode?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = {
        type: 'DEPOSIT_FUNDS',
        amount,
        promoCode,
        userId: accountRef.current.id || account.id,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const withdrawFunds = (amount: number, address: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSClientAction = {
        type: 'WITHDRAW_FUNDS',
        amount,
        address,
        userId: accountRef.current.id || account.id,
      };
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
