import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { MarketEngine } from './market/MarketEngine.js';
import { SettlementEngine } from './engine/SettlementEngine.js';
import { AdminManager } from './admin/AdminManager.js';
import { WSClientAction, WSServerAction } from './types.js';
import { SupabaseDb } from './db/supabase.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Supabase connection
SupabaseDb.init();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const marketEngine = new MarketEngine();
const adminManager = new AdminManager();
const settlementEngine = new SettlementEngine(marketEngine, adminManager);

marketEngine.start();

interface ClientSession {
  ws: WebSocket;
  subscribedAsset: string;
  timeframe: number;
}

const clients = new Map<WebSocket, ClientSession>();

function broadcast(action: WSServerAction) {
  const serialized = JSON.stringify(action);
  for (const session of clients.values()) {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serialized);
    }
  }
}

function sendToClient(ws: WebSocket, action: WSServerAction) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(action));
  }
}

// ================= PUBLIC USER ENDPOINTS =================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.get('/api/assets', (req, res) => {
  res.json(marketEngine.getAssets());
});

app.get('/api/candles/:assetId', (req, res) => {
  const tf = Number(req.query.timeframe) || 5;
  const candles = marketEngine.getCandles(req.params.assetId, tf);
  res.json(candles);
});

app.get('/api/assets/:assetId/candles', (req, res) => {
  const tf = Number(req.query.timeframe) || 5;
  const candles = marketEngine.getCandles(req.params.assetId, tf);
  res.json({ assetId: req.params.assetId, timeframe: tf, candles });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(settlementEngine.getLeaderboard());
});

app.get('/api/account', (req, res) => {
  res.json(settlementEngine.getAccount());
});

// ================= USER AUTHENTICATION ENDPOINTS =================
app.post('/api/auth/login', (req, res) => {
  const { identifier, email, phone, password } = req.body;
  const rawId = (identifier || email || phone || '').toString().trim();
  const rawPass = (password || '').toString();

  if (!rawId) {
    return res.status(400).json({ error: 'Please enter your Email address or Phone number' });
  }
  if (!rawPass) {
    return res.status(400).json({ error: 'Please enter your password' });
  }

  const users = adminManager.getUsers();
  const cleanId = rawId.toLowerCase();
  const digitsOnly = rawId.replace(/\D/g, '');

  const found = users.find(u => {
    // Check Email match
    if (u.email && u.email.toLowerCase() === cleanId) return true;
    
    // Check Phone match
    if (u.phone && digitsOnly.length >= 7) {
      const uDigits = u.phone.replace(/\D/g, '');
      if (uDigits === digitsOnly || uDigits.endsWith(digitsOnly) || digitsOnly.endsWith(uDigits)) {
        return true;
      }
    }
    return false;
  });

  if (!found) {
    return res.status(401).json({
      error: 'Account not found. Client accounts are exclusively issued by Forex Grow Account Managers. Please contact your manager to receive your credentials.'
    });
  }

  if (found.status === 'FROZEN') {
    return res.status(403).json({
      error: 'This trading account has been suspended by administration. Please contact your account manager.'
    });
  }

  const expectedPassword = found.password || 'forexgrow123';
  if (rawPass !== expectedPassword) {
    return res.status(401).json({
      error: 'Incorrect password. Please verify your credentials or contact your manager.'
    });
  }

  settlementEngine.setCurrentUserId(found.id);
  broadcast({
    type: 'BALANCE_UPDATE',
    demoBalance: found.demoBalance,
    realBalance: found.realBalance,
    activeAccountType: found.activeAccountType,
    currency: found.currency,
  });

  const safeUser = { ...found };
  delete safeUser.password;

  return res.json({
    success: true,
    user: safeUser,
    token: `jwt_session_${found.id}_${Date.now()}`
  });
});

app.post('/api/auth/register', (_req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. Client trading accounts are issued exclusively by Forex Grow Account Managers and Desk Administrators. Please contact support.'
  });
});

// ================= FOREX GROW PAYMENT GATEWAY & PROOF ENDPOINTS =================
app.get('/api/payment/settings', (_req, res) => {
  res.json({
    success: true,
    settings: adminManager.getPaymentSettings(),
  });
});

app.post('/api/payment/deposit-proof', (req, res) => {
  const { userId, amount, currency, amountUSD, utrNumber, proofImage, promoCode, paymentRail, bankDetails } = req.body;
  const currentAcc = settlementEngine.getAccount();
  const targetUserId = userId || currentAcc?.id;
  const allUsers = adminManager.getUsers();
  const user = (targetUserId ? adminManager.getUser(targetUserId) : null) || 
               adminManager.getUser(currentAcc?.id) || 
               (allUsers.length > 0 ? allUsers[0] : null);

  const numUSD = Number(amountUSD) || Number(amount) || 100;
  if (numUSD <= 0) return res.status(400).json({ error: 'Invalid deposit amount' });
  if (!utrNumber || utrNumber.trim().length < 4) {
    return res.status(400).json({ error: 'Please enter a valid 12-digit UPI / Bank Transaction UTR Reference number' });
  }

  const activeSettings = adminManager.getPaymentSettings();
  const isBank = paymentRail === 'BANK';
  const methodLabel = isBank 
    ? `Bank Transfer (${activeSettings.bankName} - A/C ${activeSettings.accountNumber})`
    : `UPI Transfer (${activeSettings.upiId})`;

  const refCode = `FG-DEP-${Math.floor(100000 + Math.random() * 900000)}`;
  const txn = adminManager.addTransaction({
    userId: user ? user.id : (userId || 'usr_guest'),
    userName: user ? user.name : (req.body.userName || 'Trader'),
    type: 'DEPOSIT',
    amount: numUSD,
    currency: currency || (user ? user.currency : 'INR'),
    method: methodLabel,
    paymentRail: isBank ? 'BANK' : 'UPI',
    promoCode: promoCode || undefined,
    status: 'PENDING',
    utrNumber: utrNumber.trim(),
    proofImage: proofImage || undefined,
    bankDetails: isBank ? {
      bankName: activeSettings.bankName,
      holderName: activeSettings.accountHolderName,
      accountNumber: activeSettings.accountNumber,
      ifscCode: activeSettings.ifscCode,
      accountType: activeSettings.accountType,
      branchName: activeSettings.branchName,
      ...bankDetails,
    } : {
      upiId: activeSettings.upiId,
      holderName: activeSettings.upiName,
      ...bankDetails,
    },
  });

  res.json({
    success: true,
    reference: refCode,
    transactionId: txn.id,
    message: 'Your payment proof has been submitted successfully! Within 5-15 minutes, your deposit will reflect in your account after verification.',
  });
});

app.post('/api/payment/deposit-instant', (req, res) => {
  const { userId, amount, currency, amountUSD, promoCode, method } = req.body;
  const currentAcc = settlementEngine.getAccount();
  const targetUserId = userId || currentAcc?.id;
  const allUsers = adminManager.getUsers();
  const user = (targetUserId ? adminManager.getUser(targetUserId) : null) || 
               adminManager.getUser(currentAcc?.id) || 
               (allUsers.length > 0 ? allUsers[0] : null);

  const numUSD = Number(amountUSD) || Number(amount) || 100;
  if (numUSD <= 0) return res.status(400).json({ error: 'Invalid deposit amount' });
  if (!user) return res.status(404).json({ error: 'User account not found' });

  let creditedUSD = numUSD;
  if (promoCode) {
    const cpnRes = adminManager.validateCoupon(promoCode, numUSD);
    if (cpnRes.valid) {
      creditedUSD += cpnRes.bonus;
    }
  }

  user.realBalance = Number((user.realBalance + creditedUSD).toFixed(2));
  user.totalDepositedUSD = Number((user.totalDepositedUSD + numUSD).toFixed(2));

  const refCode = `FG-DEP-${Math.floor(100000 + Math.random() * 900000)}`;
  const txn = adminManager.addTransaction({
    userId: user.id,
    userName: user.name,
    type: 'DEPOSIT',
    amount: numUSD,
    currency: currency || user.currency || 'INR',
    method: method || 'Instant UPI Fast-Track',
    promoCode: promoCode || undefined,
    status: 'APPROVED',
    utrNumber: `INSTANT-${Date.now().toString().slice(-8)}`,
  });

  adminManager.emit('user_updated', user);
  adminManager.emit('transaction_updated', txn);
  SupabaseDb.saveUser(user);

  settlementEngine.setCurrentUserId(user.id);
  broadcast({
    type: 'BALANCE_UPDATE',
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: 'REAL',
    currency: user.currency,
  });

  res.json({
    success: true,
    reference: refCode,
    transactionId: txn.id,
    newBalance: user.realBalance,
    message: `Deposit of ${user.currency} ${(numUSD * (user.currency === 'INR' ? 95 : 1)).toFixed(2)} was credited successfully to your Real Live Account!`,
  });
});

app.post('/api/payment/transactions/:id/fast-track', (req, res) => {
  const result = adminManager.approveTransaction(String(req.params.id), {
    id: 'sys_instant',
    name: 'Fast-Track Instant Gateway',
    role: 'ADMIN',
  });
  if (!result.success) return res.status(400).json({ error: result.error });

  const user = adminManager.getUser(result.transaction!.userId);
  if (user) {
    settlementEngine.setCurrentUserId(user.id);
    broadcast({
      type: 'BALANCE_UPDATE',
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: 'REAL',
      currency: user.currency,
    });
  }

  res.json({
    success: true,
    message: 'Deposit has been verified and credited to your Real Account!',
    transaction: result.transaction,
    newBalance: user?.realBalance,
  });
});

app.post('/api/payment/withdraw-request', (req, res) => {
  const { userId, amount, amountUSD, payoutMethod, bankDetails } = req.body;
  const currentAcc = settlementEngine.getAccount();
  const targetUserId = userId || currentAcc?.id;
  const allUsers = adminManager.getUsers();
  const user = (targetUserId ? adminManager.getUser(targetUserId) : null) || 
               adminManager.getUser(currentAcc?.id) || 
               (allUsers.length > 0 ? allUsers[0] : null);

  const numUSD = Number(amountUSD) || Number(amount) || 0;
  if (numUSD <= 0) return res.status(400).json({ error: 'Invalid withdrawal amount' });
  if (!user) {
    return res.status(404).json({ error: 'Trader account not found. Please log in again.' });
  }
  
  if (user.realBalance < numUSD) {
    return res.status(400).json({ error: 'Insufficient real live balance for withdrawal. Only real funds can be withdrawn.' });
  }

  // Deduct real balance immediately from live account
  adminManager.adjustUserBalance({
    userId: user.id,
    accountType: 'REAL',
    action: 'REMOVE',
    amount: numUSD,
  });

  const payoutRef = `FG-WDR-${Math.floor(100000 + Math.random() * 900000)}`;
  let methodDesc = 'Bank Transfer / UPI Payout';
  if (payoutMethod === 'UPI' && bankDetails?.upiId) {
    methodDesc = `UPI Payout (${bankDetails.upiId})`;
  } else if (bankDetails?.accountNumber) {
    methodDesc = `Bank Transfer (${bankDetails.bankName || 'Bank'} A/C: ${bankDetails.accountNumber} IFSC: ${bankDetails.ifsc})`;
  }

  const txn = adminManager.addTransaction({
    userId: user.id,
    userName: user.name,
    type: 'WITHDRAWAL',
    amount: numUSD,
    currency: user.currency,
    method: methodDesc,
    address: bankDetails?.upiId || bankDetails?.accountNumber,
    bankDetails,
    status: 'PENDING',
  });

  broadcast({
    type: 'BALANCE_UPDATE',
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  res.json({
    success: true,
    reference: payoutRef,
    transactionId: txn.id,
    newBalance: user.realBalance,
    message: 'Withdrawal request submitted successfully! Within 24 working hours, your withdrawal will be deposited into your account once approved by our finance team.',
  });
});

app.post('/api/payment/novupay/webhook', (req, res) => {
  const { transactionId, orderId, userId, amountUSD, promoCode, paymentRail, status } = req.body;

  if (status !== 'APPROVED') {
    return res.status(400).json({ error: 'NovuPay transaction was not approved' });
  }

  const currentAcc = settlementEngine.getAccount();
  const targetUserId = userId || currentAcc.id;
  const user = adminManager.getUser(targetUserId);

  if (!user) {
    return res.status(404).json({ error: 'Trader account not found' });
  }

  const amount = Number(amountUSD) || 100;
  let bonus = 0;
  let bonusText = '';

  if (promoCode && promoCode.trim().length > 0) {
    const couponRes = adminManager.validateCoupon(promoCode, amount);
    if (couponRes.valid) {
      bonus = couponRes.bonus;
      bonusText = ` (+ ${user.currency} ${bonus.toFixed(2)} ${promoCode.toUpperCase()} Bonus!)`;
    }
  }

  const totalCredited = amount + bonus;
  user.realBalance = Number((user.realBalance + totalCredited).toFixed(2));
  user.totalDepositedUSD = Number((user.totalDepositedUSD + amount).toFixed(2));

  // Record verified NovuPay transaction in system ledger
  const refCode = transactionId || `NP-TXN-${Math.floor(Math.random() * 900000 + 100000)}`;
  const txn = adminManager.addTransaction({
    userId: user.id,
    userName: user.name,
    type: 'DEPOSIT',
    amount,
    currency: user.currency,
    method: `NovuPay Orchestration (${paymentRail || 'Instant APM'}) [${refCode}]`,
    promoCode,
    status: 'APPROVED',
  });

  // Real-time terminal broadcast
  broadcast({
    type: 'BALANCE_UPDATE',
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  broadcast({
    type: 'TRANSACTION_SUCCESS',
    message: `NovuPay Deposit of ${user.currency} ${amount.toFixed(2)}${bonusText} settled successfully! Ref: ${refCode}`,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
  });

  res.json({
    success: true,
    status: 'SETTLED',
    reference: refCode,
    newBalance: user.realBalance,
    message: 'NovuPay webhook settled and credited to live account.',
  });
});

app.post('/api/payment/novupay/payout', (req, res) => {
  const { userId, amount, payoutRail, destinationAddress } = req.body;
  const currentAcc = settlementEngine.getAccount();
  const targetUserId = userId || currentAcc.id;
  const user = adminManager.getUser(targetUserId);

  if (!user) return res.status(404).json({ error: 'Trader account not found' });

  const numAmount = Number(amount);
  if (numAmount <= 0) return res.status(400).json({ error: 'Invalid payout amount' });
  if (user.realBalance < numAmount) return res.status(400).json({ error: 'Insufficient live balance' });

  user.realBalance = Number((user.realBalance - numAmount).toFixed(2));

  const payoutRef = `NP-PO-${Math.floor(Math.random() * 900000 + 100000)}`;
  const txn = adminManager.addTransaction({
    userId: user.id,
    userName: user.name,
    type: 'WITHDRAWAL',
    amount: numAmount,
    currency: user.currency,
    method: `NovuPay Payouts API (${payoutRail || 'Direct APM / Crypto'}) [${payoutRef}]`,
    address: destinationAddress,
    status: 'PENDING',
  });

  broadcast({
    type: 'BALANCE_UPDATE',
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  res.json({
    success: true,
    reference: payoutRef,
    transactionId: txn.id,
    newBalance: user.realBalance,
    message: `NovuPay Payout request for ${user.currency} ${numAmount.toFixed(2)} submitted for 1-click admin release!`,
  });
});

// ================= ADMIN DASHBOARD ENDPOINTS =================
app.get('/api/admin/overview', (req, res) => {
  res.json(adminManager.getOverview());
});

app.get('/api/admin/users', (req, res) => {
  res.json(adminManager.getUsers());
});

app.post('/api/admin/users/create', (req, res) => {
  const result = adminManager.createUser(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

app.post('/api/admin/users/:userId/adjust-balance', (req, res) => {
  const { userId } = req.params;
  const { accountType, action, amount, reason, currency } = req.body;

  if (currency) {
    adminManager.updateUser(userId, { currency });
  }

  let result;
  if (Number(amount) > 0) {
    result = adminManager.adjustUserBalance({
      userId,
      accountType: accountType || 'REAL',
      action: action || 'ADD',
      amount: Number(amount),
      reason,
    });
  } else {
    const updated = adminManager.getUser(userId);
    result = { success: true, user: updated ? { ...updated } : undefined };
  }

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Notify client over WebSocket of updated balance & currency
  if (result.user) {
    broadcast({
      type: 'BALANCE_UPDATE',
      demoBalance: result.user.demoBalance,
      realBalance: result.user.realBalance,
      activeAccountType: result.user.activeAccountType,
      currency: result.user.currency,
    });
  }

  res.json(result);
});

app.post('/api/admin/users/:userId/update', (req, res) => {
  const { userId } = req.params;
  const result = adminManager.updateUser(userId, req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

app.get('/api/admin/transactions', (req, res) => {
  res.json(adminManager.getTransactions());
});

app.post('/api/admin/transactions/:id/approve', (req, res) => {
  const result = adminManager.approveTransaction(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const user = adminManager.getUser(result.transaction!.userId);
  if (user) {
    broadcast({
      type: 'BALANCE_UPDATE',
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
  }

  res.json(result);
});

app.post('/api/admin/transactions/:id/reject', (req, res) => {
  const { reason } = req.body;
  const result = adminManager.rejectTransaction(req.params.id, reason);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const user = adminManager.getUser(result.transaction!.userId);
  if (user && (user.id === settlementEngine.getAccount().id || user.id === 'usr_quotex_vip_99')) {
    broadcast({
      type: 'BALANCE_UPDATE',
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
  }

  res.json(result);
});

app.get('/api/admin/coupons', (req, res) => {
  res.json(adminManager.getCoupons());
});

app.post('/api/admin/coupons', (req, res) => {
  const result = adminManager.createCoupon(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

app.post('/api/admin/coupons/:id/toggle', (req, res) => {
  const result = adminManager.toggleCoupon(req.params.id);
  res.json(result);
});

app.delete('/api/admin/coupons/:id', (req, res) => {
  const success = adminManager.deleteCoupon(req.params.id);
  res.json({ success });
});

// Admin Bank & UPI Payment Receiving Settings
app.post('/api/admin/payment/settings', (req: express.Request, res: express.Response) => {
  const { actorName, actorId, ...settings } = req.body;
  const updated = adminManager.updatePaymentSettings(settings, {
    id: actorId || 'admin_01',
    name: actorName || 'Administrator',
    role: 'ADMIN',
  });
  res.json({ success: true, settings: updated });
});

// ================= MANAGER DESK ENDPOINTS =================
app.get('/api/manager/overview', (req: express.Request, res: express.Response) => {
  res.json(adminManager.getManagerOverview());
});

app.get('/api/manager/users', (req: express.Request, res: express.Response) => {
  res.json(adminManager.getUsers());
});

app.post('/api/manager/users/create', (req: express.Request, res: express.Response) => {
  const { name, email, phone, password, demoBalance, realBalance, currency, vipLevel, actorName, actorId } = req.body;
  const result = adminManager.createUser({
    name,
    email,
    phone,
    password,
    demoBalance,
    realBalance,
    currency,
    vipLevel,
    role: 'TRADER',
    actor: {
      id: actorId || 'mgr_01',
      name: actorName || 'Operations Manager',
      role: 'MANAGER',
    },
  });
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/manager/users/:id/kyc', (req: express.Request, res: express.Response) => {
  const { isVerified, actorName, actorId } = req.body;
  const result = adminManager.setUserKyc(String(req.params.id), Boolean(isVerified), {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/manager/users/:id/status', (req: express.Request, res: express.Response) => {
  const { status, actorName, actorId } = req.body;
  const result = adminManager.setUserStatus(String(req.params.id), status, {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/manager/users/:id/reset-demo', (req: express.Request, res: express.Response) => {
  const { actorName, actorId } = req.body;
  const result = adminManager.resetUserDemo(String(req.params.id), {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get('/api/manager/transactions', (req: express.Request, res: express.Response) => {
  res.json(adminManager.getTransactions());
});

app.post('/api/manager/transactions/:id/approve', (req: express.Request, res: express.Response) => {
  const { actorName, actorId } = req.body;
  const result = adminManager.approveTransaction(String(req.params.id), {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  if (!result.success) return res.status(400).json({ error: result.error });

  const user = adminManager.getUser(result.transaction!.userId);
  if (user) {
    broadcast({
      type: 'BALANCE_UPDATE',
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
  }
  res.json(result);
});

app.post('/api/manager/transactions/:id/reject', (req: express.Request, res: express.Response) => {
  const { reason, actorName, actorId } = req.body;
  const result = adminManager.rejectTransaction(String(req.params.id), reason, {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  if (!result.success) return res.status(400).json({ error: result.error });

  const user = adminManager.getUser(result.transaction!.userId);
  if (user) {
    broadcast({
      type: 'BALANCE_UPDATE',
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
  }
  res.json(result);
});

app.get('/api/manager/trades', (req: express.Request, res: express.Response) => {
  const allUsers = adminManager.getUsers();
  const allTrades: any[] = [];
  for (const u of allUsers) {
    const userTrades = settlementEngine.getTradesForUser(u.id);
    if (userTrades) {
      allTrades.push(...(userTrades.activeTrades || []), ...(userTrades.tradeHistory || []));
    }
  }
  allTrades.sort((a, b) => b.openTime - a.openTime);
  res.json(allTrades.slice(0, 100));
});

app.get('/api/manager/audit-logs', (req: express.Request, res: express.Response) => {
  res.json(adminManager.getAuditLogs());
});

app.post('/api/manager/payment/settings', (req: express.Request, res: express.Response) => {
  const { actorName, actorId, ...settings } = req.body;
  const updated = adminManager.updatePaymentSettings(settings, {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  res.json({ success: true, settings: updated });
});

app.post('/api/admin/assets/:id/payout', (req, res) => {
  const { payout } = req.body;
  const success = marketEngine.setAssetPayout(req.params.id, Number(payout));
  if (!success) {
    return res.status(400).json({ error: 'Asset not found' });
  }
  const assets = marketEngine.getAssets();
  broadcast({ type: 'ASSETS_UPDATE', assets });
  res.json({ success, payout });
});

// Admin Trade Management Endpoints
app.get('/api/admin/users/:userId/trades', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const trades = settlementEngine.getTradesForUser(userId);
  res.json(trades);
});

app.delete('/api/admin/trades/:tradeId', (req: express.Request, res: express.Response) => {
  const tradeId = String(req.params.tradeId);
  const success = settlementEngine.deleteTrade(tradeId);
  res.json({ success });
});

app.delete('/api/admin/users/:userId/trades', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const count = settlementEngine.clearUserHistory(userId);
  res.json({ success: true, count });
});

// Market Engine Event Listeners
marketEngine.on('tick', (tick) => {
  const message: WSServerAction = { type: 'TICK', tick };
  const serialized = JSON.stringify(message);

  for (const session of clients.values()) {
    if (session.subscribedAsset === tick.assetId && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serialized);
    }
  }
});

marketEngine.on('candle_update', ({ assetId, candle }) => {
  for (const session of clients.values()) {
    if (session.subscribedAsset === assetId && session.ws.readyState === WebSocket.OPEN) {
      const tf = session.timeframe || 5;
      const activeCandle = marketEngine.getCurrentCandle(assetId, tf) || candle;
      session.ws.send(JSON.stringify({ 
        type: 'CANDLE_UPDATE', 
        assetId, 
        candle: activeCandle, 
        timeframe: tf 
      }));
    }
  }
});

marketEngine.on('sentiment_update', (sentiment) => {
  const message: WSServerAction = { type: 'SENTIMENT_UPDATE', sentiment };
  const serialized = JSON.stringify(message);

  for (const session of clients.values()) {
    if (session.subscribedAsset === sentiment.assetId && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serialized);
    }
  }
});

// Settlement Event Listener
settlementEngine.on('trade_settled', ({ trade, newBalance }) => {
  broadcast({ type: 'TRADE_SETTLED', trade, newBalance });
});

settlementEngine.on('trade_deleted', ({ tradeId, userId }) => {
  broadcast({ type: 'TRADE_DELETED', tradeId, userId });
});

settlementEngine.on('user_history_cleared', ({ userId }) => {
  broadcast({ type: 'USER_HISTORY_CLEARED', userId });
});

settlementEngine.on('balance_updated', (data) => {
  broadcast({
    type: 'BALANCE_UPDATE',
    demoBalance: data.demoBalance,
    realBalance: data.realBalance,
    activeAccountType: data.activeAccountType,
    currency: data.currency,
  });
});

settlementEngine.on('leaderboard_updated', (leaderboard) => {
  broadcast({ type: 'LEADERBOARD_UPDATE', leaderboard });
});

// WebSocket Connection Handler
wss.on('connection', (ws: WebSocket) => {
  const defaultAsset = 'EURUSD_OTC';
  const session: ClientSession = {
    ws,
    subscribedAsset: defaultAsset,
    timeframe: 5,
  };
  clients.set(ws, session);

  const account = settlementEngine.getAccount();
  const assets = marketEngine.getAssets();
  const activeTrades = settlementEngine.getActiveTrades();
  const tradeHistory = settlementEngine.getTradeHistory();
  const leaderboard = settlementEngine.getLeaderboard();

  sendToClient(ws, {
    type: 'INIT_STATE',
    account,
    assets,
    activeTrades,
    tradeHistory,
    leaderboard,
  });

  const history = marketEngine.getCandles(defaultAsset, session.timeframe);
  sendToClient(ws, {
    type: 'CANDLES_HISTORY',
    assetId: defaultAsset,
    candles: history,
    timeframe: session.timeframe,
  });

  const initialSentiment = marketEngine.getSentiment(defaultAsset);
  if (initialSentiment) {
    sendToClient(ws, { type: 'SENTIMENT_UPDATE', sentiment: initialSentiment });
  }

  ws.on('message', (raw: string) => {
    try {
      const action = JSON.parse(raw.toString()) as WSClientAction;

      switch (action.type) {
        case 'SUBSCRIBE_ASSET': {
          session.subscribedAsset = action.assetId;
          if (action.timeframe) session.timeframe = action.timeframe;
          const candles = marketEngine.getCandles(action.assetId, session.timeframe);
          sendToClient(ws, {
            type: 'CANDLES_HISTORY',
            assetId: action.assetId,
            candles,
            timeframe: session.timeframe,
          });

          const targetAsset = marketEngine.getAsset(action.assetId);
          if (targetAsset) {
            sendToClient(ws, {
              type: 'TICK',
              tick: {
                assetId: targetAsset.id,
                price: targetAsset.currentPrice,
                time: Math.floor(Date.now() / 1000),
              },
            });
          }

          const currentSentiment = marketEngine.getSentiment(action.assetId);
          if (currentSentiment) {
            sendToClient(ws, { type: 'SENTIMENT_UPDATE', sentiment: currentSentiment });
          }
          break;
        }

        case 'SET_TIMEFRAME': {
          session.timeframe = action.timeframe || 5;
          const targetAsset = action.assetId || session.subscribedAsset;
          const candles = marketEngine.getCandles(targetAsset, session.timeframe);
          sendToClient(ws, {
            type: 'CANDLES_HISTORY',
            assetId: targetAsset,
            candles,
            timeframe: session.timeframe,
          });
          break;
        }

        case 'PLACE_TRADE': {
          const result = settlementEngine.placeTrade({
            assetId: action.assetId,
            direction: action.direction,
            amount: action.amount,
            duration: action.duration,
          });

          if ('error' in result) {
            sendToClient(ws, { type: 'ERROR', message: result.error });
          } else {
            sendToClient(ws, {
              type: 'TRADE_OPENED',
              trade: result.trade,
              newBalance: result.newBalance,
            });
          }
          break;
        }

        case 'SWITCH_ACCOUNT': {
          const updated = settlementEngine.switchAccountType(action.accountType);
          sendToClient(ws, {
            type: 'BALANCE_UPDATE',
            demoBalance: updated.demoBalance,
            realBalance: updated.realBalance,
            activeAccountType: updated.activeAccountType,
            currency: updated.currency,
          });
          break;
        }

        case 'SWITCH_CURRENCY': {
          const updated = settlementEngine.switchCurrency(action.currency);
          sendToClient(ws, {
            type: 'BALANCE_UPDATE',
            demoBalance: updated.demoBalance,
            realBalance: updated.realBalance,
            activeAccountType: updated.activeAccountType,
            currency: updated.currency,
          });
          break;
        }

        case 'RESET_DEMO_BALANCE': {
          const updated = settlementEngine.resetDemoBalance();
          sendToClient(ws, {
            type: 'BALANCE_UPDATE',
            demoBalance: updated.demoBalance,
            realBalance: updated.realBalance,
            activeAccountType: updated.activeAccountType,
            currency: updated.currency,
          });
          break;
        }

        case 'DEPOSIT_FUNDS': {
          const res = settlementEngine.depositFunds(action.amount, action.promoCode);
          const acc = settlementEngine.getAccount();
          sendToClient(ws, {
            type: 'TRANSACTION_SUCCESS',
            message: res.message,
            demoBalance: acc.demoBalance,
            realBalance: acc.realBalance,
          });
          break;
        }

        case 'WITHDRAW_FUNDS': {
          const res = settlementEngine.withdrawFunds(action.amount, action.address);
          const acc = settlementEngine.getAccount();
          if (res.success) {
            sendToClient(ws, {
              type: 'TRANSACTION_SUCCESS',
              message: res.message,
              demoBalance: acc.demoBalance,
              realBalance: acc.realBalance,
            });
          } else {
            sendToClient(ws, { type: 'ERROR', message: res.message });
          }
          break;
        }

        case 'SYNC_USER': {
          if (action.userId) {
            const user = settlementEngine.setCurrentUserId(action.userId);
            if (user) {
              sendToClient(ws, {
                type: 'BALANCE_UPDATE',
                demoBalance: user.demoBalance,
                realBalance: user.realBalance,
                activeAccountType: user.activeAccountType,
                currency: user.currency,
              });
            }
          }
          break;
        }
      }
    } catch (err: any) {
      console.error('Failed to parse WS message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// ================= STATIC FRONTEND SERVING (For Render Single Service) =================
const frontendDistCandidates = [
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
];

const foundDist = frontendDistCandidates.find((p) => fs.existsSync(p));

if (foundDist) {
  console.log(`📦 Serving compiled frontend from: ${foundDist}`);
  app.use(express.static(foundDist));

  app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(foundDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Binary Trading Realtime Engine running on http://localhost:${PORT} and ws://localhost:${PORT}`);
});
