// Centralized API and WebSocket URL resolver for dev and production

export const getApiUrl = (): string => {
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, '');
  }
  // Local development fallback
  if (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')) {
    return `http://${window.location.hostname}:4000`;
  }
  // In production (e.g. Render unified service), use relative path
  return '';
};

export const getWsUrl = (): string => {
  const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
  if (envWsUrl) {
    return envWsUrl;
  }
  if (typeof window === 'undefined') {
    return 'ws://localhost:4000';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Local development fallback
  if (window.location.port === '3000' || window.location.port === '5173') {
    return `${protocol}//${window.location.hostname}:4000`;
  }
  // In production (Render HTTPS / custom domain), connect to current host via secure WebSocket (WSS)
  return `${protocol}//${window.location.host}`;
};

export const apiUrl = (endpoint: string): string => {
  const base = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};
