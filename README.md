# Binary Trade App (Quotex Architecture & Clone)

A full-stack, real-time Binary Options trading platform inspired by [Quotex](https://quotex.com/en), designed for high performance, sub-second latency, and responsive financial charting.

---

## 🌟 Key Architecture & Capabilities

### 1. **Frontend Trading Floor (`/frontend`)**
* **TradingView Lightweight Charts:** Buttery smooth real-time candlestick & tick chart rendering.
* **Quotex-style Dark Theme UI:** Neon emerald (`#00c679`) and rose red (`#ff3d5a`) trading buttons, strike price lines, and active order countdowns.
* **Order Placement Ticket:**
  * Expiry duration presets (`5s`, `15s`, `30s`, `1m`, `5m`).
  * Investment amount controls (`+$5`, `+$10`, `+$50`, `+$100` quick chips).
  * Real-time payout calculations (`+85%` to `+92%`).
  * Big **UP (CALL)** and **DOWN (PUT)** action buttons.
* **Real-time Positions & Settlement:**
  * Active trades with live remaining time countdown.
  * Trade history table (Won, Lost, Tie).
  * Confetti celebration on winning trade settlements!
* **Multi-Asset Catalog Modal:**
  * Instant search & filtering for Forex (`EUR/USD`, `GBP/USD`, `USD/JPY`), Crypto (`BTC/USDT`, `ETH/USDT`), and Commodities (`Gold`).

### 2. **Real-time Backend Gateway & Settlement Engine (`/backend`)**
* **WebSocket Streaming Server (`ws`):** High-frequency market tick distribution, candle aggregations, and bi-directional trading signals.
* **Realistic Market Simulation:** Geometric Brownian motion random-walk generator creating realistic price action and 5-second candles for multiple assets.
* **Settlement Engine:**
  * Deducts investment stake on order placement.
  * Automatically evaluates trades upon expiry:
    * **UP:** Exit price > Entry price $\to$ Win (`stake * (1 + payout%)`).
    * **DOWN:** Exit price < Entry price $\to$ Win (`stake * (1 + payout%)`).
    * **TIE:** Exit price == Entry price $\to$ Refund stake.
  * Instant balance reconciliation for Demo ($10,000) and Real accounts.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: v18+ (tested on Node v24)
* **npm**: v9+

### 1. Start the Backend Server (Port 4000)
```powershell
cd backend
npm run dev
```
*HTTP API running on `http://localhost:4000`*  
*WebSocket Gateway running on `ws://localhost:4000`*

### 2. Start the Frontend Web UI (Port 3000)
In a separate terminal:
```powershell
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to start trading!

---

## 🔍 How to Use `morluto/rea` (Reverse Engineer Anything) With This

You can use `rea` to inspect Quotex's actual production WebSocket packets and extract exact payloads to expand this platform:

1. Clone REA or run its agent runner:
   ```bash
   npx rea-agents setup
   ```
2. Run network capture on `quotex.com` to observe:
   * **WS Handshake tokens:** Any auth headers or device fingerprints sent during session startup.
   * **Tick feeds:** Exact candle framing format and compression (gzip, binary frames vs JSON).
   * **Order payloads:** Quotex's order placement schema (`timeframe`, `pair_id`, `direction`, `bet`).

