import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { MarketEngine } from './market/MarketEngine.js';
import { SettlementEngine } from './engine/SettlementEngine.js';
import { AdminManager } from './admin/AdminManager.js';
import { emailService } from './services/EmailService.js';
import { securityFirewall } from './security/SecurityFirewall.js';
import { WSClientAction, WSServerAction } from './types.js';
import { SupabaseDb } from './db/supabase.js';

const app = express();

// Trust reverse proxy headers (Render, Cloudflare, AWS) so rate limiting and client IP detection work accurately
app.set('trust proxy', 1);

// ================= LAYER 1: WAF & STRICT HTTP SECURITY HEADERS =================
app.use(securityFirewall.getHelmetMiddleware());

// Cross-Origin Resource Sharing (CORS) Configuration
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global Layer 7 DDoS & Scraping Rate Limiter (300 requests/minute per IP)
app.use('/api', securityFirewall.getGlobalApiLimiter());

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
  userId?: string;
  sessionToken?: string;
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

function sendToUser(userId: string, action: WSServerAction) {
  const serialized = JSON.stringify(action);
  for (const session of clients.values()) {
    if (session.userId === userId && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serialized);
    }
  }
}

function sendToStaff(action: WSServerAction) {
  const serialized = JSON.stringify(action);
  for (const session of clients.values()) {
    if (session.userId && (session.userId === 'usr_admin_001' || session.userId === 'usr_manager_ops_01') && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serialized);
    }
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
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || undefined;
  res.json(settlementEngine.getAccount(userId));
});

app.get('/api/user/:userId/transactions', (req, res) => {
  const { userId } = req.params;
  const txns = adminManager.getTransactionsForUser(userId);
  res.json({ success: true, transactions: txns });
});

// ================= CONCURRENT ACTIVE SESSIONS TRACKER =================
export interface ActiveSession {
  token: string;
  userId: string;
  userName: string;
  role: string;
  loginTime: number;
  lastSeen: number;
}

// Rule: Account-Based Device Concurrency for Traders.
// Multiple different trader accounts can access and trade on the platform simultaneously.
// For each individual trader account, a maximum of 2 devices / sessions are permitted concurrently.
// If a 3rd device / session signs into that same trader account, previous sessions for that account are auto-logged out.
// Admin and Manager sessions are completely INDEPENDENT and unconstrained.
const MAX_DEVICES_PER_TRADER_ACCOUNT = 2;

// In-memory active authenticated TRADER sessions: userId -> Map<token, ActiveSession>
const traderAccountSessions = new Map<string, Map<string, ActiveSession>>();
// In-memory active administrative staff (Admin & Manager)
const activeStaffSessions = new Map<string, ActiveSession>();

// Helper to count total active trader devices
function getTotalActiveTraderDevices(): number {
  let count = 0;
  for (const sessMap of traderAccountSessions.values()) {
    count += sessMap.size;
  }
  return count;
}

// ================= USER AUTHENTICATION ENDPOINTS =================
app.get('/api/auth/concurrency-status', (_req, res) => {
  const allTraderSessions: any[] = [];
  for (const sessMap of traderAccountSessions.values()) {
    for (const s of sessMap.values()) {
      allTraderSessions.push({
        userId: s.userId,
        userName: s.userName,
        role: s.role,
        loginTime: s.loginTime,
      });
    }
  }

  res.json({
    maxDevicesPerAccount: MAX_DEVICES_PER_TRADER_ACCOUNT,
    activeTraderAccountsCount: traderAccountSessions.size,
    totalActiveTraderDevices: allTraderSessions.length,
    activeTraderCount: traderAccountSessions.size,
    activeStaffCount: activeStaffSessions.size,
    traderSessions: allTraderSessions,
    staffSessions: Array.from(activeStaffSessions.values()).map(s => ({
      userId: s.userId,
      userName: s.userName,
      role: s.role,
      loginTime: s.loginTime,
    })),
  });
});

app.post('/api/auth/logout', (req, res) => {
  const userId = req.body?.userId;
  const token = req.body?.token;
  let wasTrader = false;

  if (userId) {
    if (traderAccountSessions.has(userId)) {
      traderAccountSessions.delete(userId);
      wasTrader = true;
    }
    if (activeStaffSessions.has(userId)) {
      activeStaffSessions.delete(userId);
    }
  } else if (token) {
    for (const [uid, sessMap] of traderAccountSessions.entries()) {
      if (sessMap.has(token)) {
        sessMap.delete(token);
        if (sessMap.size === 0) {
          traderAccountSessions.delete(uid);
        }
        wasTrader = true;
        break;
      }
    }
    for (const [uid, sess] of activeStaffSessions.entries()) {
      if (sess.token === token) {
        activeStaffSessions.delete(uid);
        break;
      }
    }
  }

  if (wasTrader) {
    broadcast({
      type: 'SESSION_CONCURRENCY_UPDATE',
      activeCount: getTotalActiveTraderDevices(),
      maxLimit: MAX_DEVICES_PER_TRADER_ACCOUNT,
      targetRole: 'TRADER',
    });
  }

  res.json({
    success: true,
    activeTraderAccountsCount: traderAccountSessions.size,
    totalActiveTraderDevices: getTotalActiveTraderDevices(),
    activeStaffCount: activeStaffSessions.size,
  });
});

// In-memory store for pending registration OTP verifications
interface PendingRegistrationOtp {
  email: string;
  name: string;
  password?: string;
  phone?: string;
  currency?: string;
  demoBalance?: number;
  realBalance?: number;
  vipLevel?: 'STANDARD' | 'PRO' | 'VIP';
  otp: string;
  expiresAt: number;
}
const pendingRegisterOtps = new Map<string, PendingRegistrationOtp>();

// In-memory store for login OTPs
interface PendingLoginOtp {
  email: string;
  userId: string;
  userName: string;
  otp: string;
  expiresAt: number;
}
const pendingLoginOtps = new Map<string, PendingLoginOtp>();

// In-memory tracker for failed password login attempts (unlocks OTP after 5 fails)
const failedAttemptsMap = new Map<string, { count: number; lastFailed: number }>();

// ================= LAYER 2: AUTHENTICATION & REGISTRATION ENDPOINTS =================

// Send 6-digit registration OTP via Brevo Email
app.post('/api/auth/send-register-otp', securityFirewall.getAuthRateLimiter(), async (req, res) => {
  const { email, name, phone, password, currency, demoBalance, realBalance, vipLevel } = req.body;
  const cleanEmail = securityFirewall.sanitizeString(email).toLowerCase();
  const cleanName = securityFirewall.sanitizeString(name) || 'Trader';
  const cleanPhone = securityFirewall.sanitizeString(phone);

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  // Check if trader already exists by email
  const existingEmail = adminManager.getAllAccounts().find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    return res.status(400).json({ error: 'An account with this email address is already registered. Please log in.' });
  }

  // Check if trader already exists by phone number
  if (cleanPhone) {
    const rawCleanPhone = cleanPhone.replace(/[^\d]/g, '');
    if (rawCleanPhone.length >= 7) {
      const existingPhone = adminManager.getAllAccounts().find(u => {
        if (!u.phone) return false;
        const p = u.phone.replace(/[^\d]/g, '');
        return p.length >= 7 && (p === rawCleanPhone || p.endsWith(rawCleanPhone) || rawCleanPhone.endsWith(p));
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'An account with this mobile phone number is already registered. Please use a different phone number.' });
      }
    }
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  pendingRegisterOtps.set(cleanEmail, {
    email: cleanEmail,
    name: cleanName,
    phone: cleanPhone,
    password: password || 'forexgrow123',
    currency: currency === 'USD' ? 'USD' : 'INR',
    demoBalance: demoBalance !== undefined ? Number(demoBalance) : 700000,
    realBalance: realBalance !== undefined ? Number(realBalance) : 0,
    vipLevel: vipLevel || 'STANDARD',
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
  });

  // Dispatch verification email with fast timeout so UI is never blocked
  let emailSent = false;
  try {
    const sendPromise = emailService.sendOtpEmail(cleanEmail, otp, cleanName);
    const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'TIMEOUT_FALLTHROUGH' }), 2000)
    );
    const result = await Promise.race([sendPromise, timeoutPromise]);
    emailSent = result.success;
    if (!emailSent) {
      sendPromise.then(r => {
        if (r.success) console.log(`[AUTH] Background verification OTP email sent to ${cleanEmail}`);
      }).catch(e => console.warn(`[AUTH] Background email send notice:`, e?.message));
    }
  } catch (err: any) {
    console.warn('[AUTH] Immediate email dispatch catch:', err?.message);
  }

  return res.json({
    success: true,
    message: emailSent
      ? `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox.`
      : `Verification code generated (${otp}). Brevo IP authorization is pending.`,
    debugOtp: otp,
  });
});

// Verify OTP & Activate Trader Account
app.post('/api/auth/verify-register-otp', securityFirewall.getAuthRateLimiter(), (req, res) => {
  const { email, otp, demoBalance, realBalance, vipLevel, isKycVerified, actor } = req.body;
  const cleanEmail = securityFirewall.sanitizeString(email).toLowerCase();
  const cleanOtp = securityFirewall.sanitizeString(otp).trim();

  const record = pendingRegisterOtps.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: 'No active OTP verification session found for this email. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    pendingRegisterOtps.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  const finalRealBal = realBalance !== undefined ? Number(realBalance) : (record.realBalance ?? 0);
  const finalDemoBal = demoBalance !== undefined ? Number(demoBalance) : (record.demoBalance ?? 700000);
  const finalVip = vipLevel || record.vipLevel || 'STANDARD';
  const finalKyc = isKycVerified !== undefined ? Boolean(isKycVerified) : false;

  // OTP verified! Create official client account
  const createResult = adminManager.createUser({
    name: record.name,
    email: record.email,
    phone: record.phone,
    password: record.password,
    currency: record.currency as any || 'INR',
    realBalance: finalRealBal,
    demoBalance: finalDemoBal,
    vipLevel: finalVip,
    isKycVerified: finalKyc,
    actor: actor,
  });

  if (!createResult.success || !createResult.user) {
    return res.status(500).json({ error: createResult.error || 'Failed to create trader account.' });
  }

  pendingRegisterOtps.delete(cleanEmail);

  // Send Welcome Email with Client Login ID and Password
  emailService.sendAccountCredentialsEmail({
    toEmail: createResult.user.email,
    clientName: createResult.user.name,
    loginId: createResult.user.id,
    password: record.password || createResult.user.password || 'Trader@2026',
    currency: createResult.user.currency,
    demoBalance: createResult.user.demoBalance,
    realBalance: createResult.user.realBalance,
    vipLevel: createResult.user.vipLevel,
    isKycVerified: createResult.user.isKycVerified,
  }).catch((err) => console.error('[EMAIL] Failed to send credentials email on register-otp:', err));

  // Generate login session token
  const sessionToken = `jwt_session_${createResult.user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let accountSessions = traderAccountSessions.get(createResult.user.id);
  if (!accountSessions) {
    accountSessions = new Map<string, ActiveSession>();
    traderAccountSessions.set(createResult.user.id, accountSessions);
  }
  accountSessions.set(sessionToken, {
    token: sessionToken,
    userId: createResult.user.id,
    userName: createResult.user.name,
    role: 'TRADER',
    loginTime: Date.now(),
    lastSeen: Date.now(),
  });

  res.json({
    success: true,
    user: createResult.user,
    token: sessionToken,
    message: 'Account successfully registered and verified via email OTP!',
  });
});

// Send 6-digit Login OTP via Email
app.post('/api/auth/send-login-otp', securityFirewall.getAuthRateLimiter(), async (req, res) => {
  const { email } = req.body;
  const cleanEmail = securityFirewall.sanitizeString(email).toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const users = adminManager.getAllAccounts();
  const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'Account not found with this email. Please verify or contact Customer Care.' });
  }

  if (user.status === 'FROZEN') {
    return res.status(403).json({ error: 'This trading account has been suspended. Please contact Customer Care.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  pendingLoginOtps.set(cleanEmail, {
    email: cleanEmail,
    userId: user.id,
    userName: user.name,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // Dispatch login OTP email with fast timeout so UI is never blocked
  let emailSent = false;
  try {
    const sendPromise = emailService.sendOtpEmail(cleanEmail, otp, user.name);
    const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'TIMEOUT_FALLTHROUGH' }), 2000)
    );
    const result = await Promise.race([sendPromise, timeoutPromise]);
    emailSent = result.success;
    if (!emailSent) {
      sendPromise.then(r => {
        if (r.success) console.log(`[AUTH] Background login OTP email sent to ${cleanEmail}`);
      }).catch(e => console.warn(`[AUTH] Background email send notice:`, e?.message));
    }
  } catch (err: any) {
    console.warn('[AUTH] Immediate login email attempt catch:', err?.message);
  }

  return res.json({
    success: true,
    message: emailSent
      ? `A 6-digit login verification code has been dispatched to ${cleanEmail}.`
      : `Login security code generated (${otp}).`,
    debugOtp: otp,
  });
});

// Verify Login OTP & Sign In
app.post('/api/auth/verify-login-otp', securityFirewall.getAuthRateLimiter(), (req, res) => {
  const { email, otp } = req.body;
  const cleanEmail = securityFirewall.sanitizeString(email).toLowerCase();
  const cleanOtp = securityFirewall.sanitizeString(otp).trim();

  const record = pendingLoginOtps.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: 'No active login session found for this email. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    pendingLoginOtps.delete(cleanEmail);
    return res.status(400).json({ error: 'Login code has expired. Please request a new code.' });
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  pendingLoginOtps.delete(cleanEmail);
  const found = adminManager.getUser(record.userId);
  if (!found) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const sessionToken = `jwt_session_${found.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // Reset failed login attempts on successful OTP login
  failedAttemptsMap.delete(found.id);

  let accountSessions = traderAccountSessions.get(found.id);
  if (!accountSessions) {
    accountSessions = new Map<string, ActiveSession>();
    traderAccountSessions.set(found.id, accountSessions);
  }

  if (accountSessions.size >= MAX_DEVICES_PER_TRADER_ACCOUNT) {
    accountSessions.clear();
  }

  accountSessions.set(sessionToken, {
    token: sessionToken,
    userId: found.id,
    userName: found.name,
    role: found.role || 'TRADER',
    loginTime: Date.now(),
    lastSeen: Date.now(),
  });

  const safeUser = { ...found };
  delete safeUser.password;

  return res.json({
    success: true,
    user: safeUser,
    token: sessionToken,
    message: 'Successfully logged in with Email OTP!',
  });
});

app.post('/api/auth/login', securityFirewall.getAuthRateLimiter(), (req, res) => {
  const { identifier, email, phone, password } = req.body;
  const rawId = (identifier || email || phone || '').toString().trim();
  const rawPass = (password || '').toString();

  if (!rawId) {
    return res.status(400).json({ error: 'Please enter your Email address or Phone number' });
  }
  if (!rawPass) {
    return res.status(400).json({ error: 'Please enter your password' });
  }

  const users = adminManager.getAllAccounts();
  const cleanId = rawId.toLowerCase();
  const digitsOnly = rawId.replace(/\D/g, '');

  const found = users.find(u => {
    // Check Email match (including aliases)
    if (u.email && u.email.toLowerCase() === cleanId) return true;
    if (cleanId === 'admin@forexgrow.com' && (u.role === 'ADMIN' || u.id === 'usr_admin_001')) return true;
    if (cleanId === 'admin' && (u.role === 'ADMIN' || u.id === 'usr_admin_001')) return true;
    if (cleanId === 'manager@forexgrow.com' && (u.role === 'MANAGER' || u.id === 'usr_manager_ops_01')) return true;
    if (cleanId === 'manager' && (u.role === 'MANAGER' || u.id === 'usr_manager_ops_01')) return true;
    if (cleanId === 'raksha@forexgrow.com' && u.role === 'MANAGER') return true;
    if (u.id.toLowerCase() === cleanId) return true;
    
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
      error: 'Account not found. Client accounts are exclusively issued by Forex Grow Account Managers. Please contact your manager or Customer Care to receive your credentials.'
    });
  }

  if (found.status === 'FROZEN') {
    return res.status(403).json({
      error: 'This trading account has been suspended by administration. Please contact Customer Care.'
    });
  }

  const expectedPassword = (found.id === 'usr_admin_001' ? '@Akarun505' : found.password) || (found.id === 'usr_manager_ops_01' ? 'manager123' : 'forexgrow123');
  const isMatch = rawPass === expectedPassword || rawPass.trim() === expectedPassword.trim();
  if (!isMatch) {
    const prevFails = failedAttemptsMap.get(found.id)?.count || 0;
    const currentFails = prevFails + 1;
    failedAttemptsMap.set(found.id, { count: currentFails, lastFailed: Date.now() });

    const canUseOtp = currentFails >= 5;
    return res.status(401).json({
      error: canUseOtp
        ? 'Incorrect password. You have reached 5 failed attempts. Security Email OTP option is now unlocked.'
        : `Incorrect password (${currentFails}/5 attempts). Please verify your credentials.`,
      failedAttempts: currentFails,
      canUseOtp,
      userEmail: found.email,
    });
  }

  // Password correct! Reset failed attempts counter
  failedAttemptsMap.delete(found.id);

  const userRole = (found.role || 'TRADER').toUpperCase();
  const isStaff = userRole === 'ADMIN' || userRole === 'MANAGER';
  const sessionToken = `jwt_session_${found.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // ================= ADMIN & MANAGER LOGINS: INDEPENDENT =================
  // Managers and Admins are NOT linked to trader concurrency limits.
  // They do NOT evict traders and are NEVER evicted by trader logins.
  if (isStaff) {
    activeStaffSessions.set(found.id, {
      token: sessionToken,
      userId: found.id,
      userName: found.name,
      role: userRole,
      loginTime: Date.now(),
      lastSeen: Date.now(),
    });

    console.log(`[AUTH] Staff login (${userRole}): "${found.name}" (${found.id}). Independent session active.`);

    const safeUser = { ...found };
    delete safeUser.password;

    return res.json({
      success: true,
      user: safeUser,
      token: sessionToken,
      activeTraderAccountsCount: traderAccountSessions.size,
      maxDevicesPerAccount: MAX_DEVICES_PER_TRADER_ACCOUNT,
      role: userRole,
    });
  }

  // ================= PER-ACCOUNT 2-DEVICE CONCURRENCY VALIDATION =================
  // Rule: Multiple different trader accounts can be logged in concurrently without restrictions.
  // BUT for any SINGLE trader account, a maximum of 2 devices / sessions are permitted simultaneously.
  // If a 3rd device signs into that SAME trader account, previous sessions for THAT account are auto-logged out!
  // Admin and Manager panels remain completely independent and uninterrupted.
  // Reset failed login attempts on successful OTP login
  failedAttemptsMap.delete(found.id);

  let accountSessions = traderAccountSessions.get(found.id);
  if (!accountSessions) {
    accountSessions = new Map<string, ActiveSession>();
    traderAccountSessions.set(found.id, accountSessions);
  }

  if (accountSessions.size >= MAX_DEVICES_PER_TRADER_ACCOUNT) {
    console.log(`[AUTH] 3rd device login for trader account "${found.name}" (${found.id}). Devices were ${accountSessions.size}/${MAX_DEVICES_PER_TRADER_ACCOUNT}. Auto-logging out previous sessions for this account.`);

    // 1. Force close all active WebSocket connections for THIS trader account
    for (const [clientWs, sess] of clients.entries()) {
      if (sess.userId === found.id && sess.sessionToken !== sessionToken) {
        try {
          sendToClient(clientWs, {
            type: 'FORCE_LOGOUT',
            targetRole: 'TRADER',
            targetUserId: found.id,
            exceptToken: sessionToken,
            reason: `Account device limit (max 2 devices) reached for ${found.name}. Another device logged in, terminating previous sessions.`,
            activeCount: 1,
          });
          clientWs.close(4001, 'DEVICE_LIMIT_EXCEEDED');
        } catch (err) {}
      }
    }

    // 2. Send immediate FORCE_LOGOUT strictly to other sessions of THIS specific trader account
    sendToUser(found.id, {
      type: 'FORCE_LOGOUT',
      targetRole: 'TRADER',
      targetUserId: found.id,
      exceptToken: sessionToken,
      reason: `Account device limit (max 2 devices) reached for ${found.name}. A new device signed in, terminating previous sessions.`,
      activeCount: 1,
    });

    // 3. Invalidate previous active sessions for THIS account only
    accountSessions.clear();
  }

  // 4. Register the new active device session for this trader
  accountSessions.set(sessionToken, {
    token: sessionToken,
    userId: found.id,
    userName: found.name,
    role: 'TRADER',
    loginTime: Date.now(),
    lastSeen: Date.now(),
  });

  // 4. Broadcast updated trader concurrency count
  broadcast({
    type: 'SESSION_CONCURRENCY_UPDATE',
    activeCount: getTotalActiveTraderDevices(),
    maxLimit: MAX_DEVICES_PER_TRADER_ACCOUNT,
    targetRole: 'TRADER',
    targetUserId: found.id,
  });

  const safeUser = { ...found };
  delete safeUser.password;

  return res.json({
    success: true,
    user: safeUser,
    token: sessionToken,
    activeDevicesForAccount: accountSessions.size,
    maxDevicesPerAccount: MAX_DEVICES_PER_TRADER_ACCOUNT,
    totalActiveTraderDevices: getTotalActiveTraderDevices(),
    activeTraderAccountsCount: traderAccountSessions.size,
    role: 'TRADER',
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

app.post('/api/payment/deposit-proof', securityFirewall.getCashierRateLimiter(), (req, res) => {
  const { userId, amount, currency, amountUSD, utrNumber, proofImage, promoCode, paymentRail, bankDetails } = req.body;
  const targetUserId = userId;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Trader account ID is required.' });
  }
  const user = adminManager.getUser(targetUserId);
  if (!user) {
    return res.status(404).json({ error: 'Trader account not found. Please log in again.' });
  }

  const txnCurrency: 'INR' | 'USD' = (currency === 'USD' ? 'USD' : (user ? (user.currency === 'USD' ? 'USD' : 'INR') : 'INR'));
  const USD_INR_RATE = 95.0;

  // Accurately capture entered amount in the transaction's currency
  const rawEntered = Number(amount) || 0;
  const rawUSD = Number(amountUSD) || 0;
  let finalAmount = rawEntered;
  let finalUSD = rawUSD;

  if (finalAmount <= 0 && finalUSD > 0) {
    finalAmount = txnCurrency === 'INR' ? Number((finalUSD * USD_INR_RATE).toFixed(2)) : finalUSD;
  }
  if (finalUSD <= 0 && finalAmount > 0) {
    finalUSD = txnCurrency === 'INR' ? Number((finalAmount / USD_INR_RATE).toFixed(2)) : finalAmount;
  }

  if (finalAmount <= 0) return res.status(400).json({ error: 'Invalid deposit amount' });
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
    amount: finalAmount,
    amountUSD: finalUSD,
    currency: txnCurrency,
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

  // Automated Security Notification: Dispatch deposit proof received email
  if (user && user.email) {
    emailService.sendDepositSubmittedEmail(
      user.email,
      user.name,
      finalAmount,
      txnCurrency,
      txn.id,
      utrNumber.trim(),
      methodLabel
    ).catch(e => console.error('[EMAIL] Failed to dispatch deposit submitted email:', e));
  }

  res.json({
    success: true,
    reference: refCode,
    transactionId: txn.id,
    message: 'Your payment proof has been submitted successfully! Waiting for payment verification by admin or manager.',
  });
});

app.post('/api/payment/withdraw-request', securityFirewall.getCashierRateLimiter(), (req, res) => {
  const { userId, amount, amountUSD, payoutMethod, bankDetails } = req.body;
  const targetUserId = userId;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Trader account ID is required.' });
  }
  const user = adminManager.getUser(targetUserId);

  if (!user) {
    return res.status(404).json({ error: 'Trader account not found. Please log in again.' });
  }

  // Regulatory Requirement: Only Aadhaar KYC Verified Traders Can Withdraw
  if (!user.isKycVerified) {
    return res.status(403).json({
      error: 'Aadhaar KYC Verification is strictly required before requesting withdrawals. Please complete your Aadhaar identity verification first.'
    });
  }

  const USD_INR_RATE = 95.0;
  const enteredAmount = Number(amount) || 0;
  const enteredUSD = Number(amountUSD) || (user.currency === 'INR' ? enteredAmount / USD_INR_RATE : enteredAmount);

  if (enteredAmount <= 0) return res.status(400).json({ error: 'Invalid withdrawal amount' });
  
  if (user.realBalance < enteredAmount) {
    return res.status(400).json({ 
      error: `Insufficient real live balance. You have ${user.currency} ${user.realBalance.toLocaleString()} available to withdraw. Only real funds can be withdrawn.` 
    });
  }

  // Deduct exact entered amount in user's currency from live account
  user.realBalance = Number((user.realBalance - enteredAmount).toFixed(2));
  adminManager.updateUser(user.id, { realBalance: user.realBalance });

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
    amount: enteredAmount,
    amountUSD: enteredUSD,
    currency: user.currency,
    method: methodDesc,
    address: bankDetails?.upiId || bankDetails?.accountNumber,
    bankDetails,
    status: 'PENDING',
  });

  sendToUser(user.id, {
    type: 'BALANCE_UPDATE',
    userId: user.id,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  // Automated Security Notification: Dispatch withdrawal requested email
  if (user.email) {
    emailService.sendWithdrawalRequestedEmail(
      user.email,
      user.name,
      txn.amount,
      user.currency,
      txn.id,
      txn.method
    ).catch(e => console.error('[EMAIL] Failed to dispatch withdrawal requested email:', e));
  }

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

  const targetUserId = userId;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Trader account ID is required.' });
  }
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
  sendToUser(user.id, {
    type: 'BALANCE_UPDATE',
    userId: user.id,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  sendToUser(user.id, {
    type: 'TRANSACTION_SUCCESS',
    userId: user.id,
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
  const targetUserId = userId;
  if (!targetUserId) return res.status(400).json({ error: 'User ID is required' });
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

  sendToUser(user.id, {
    type: 'BALANCE_UPDATE',
    userId: user.id,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  // Automated Security Notification: Dispatch withdrawal requested email
  if (user.email) {
    emailService.sendWithdrawalRequestedEmail(
      user.email,
      user.name,
      txn.amount,
      user.currency,
      txn.id,
      txn.method
    ).catch(e => console.error('[EMAIL] Failed to dispatch withdrawal requested email:', e));
  }

  res.json({
    success: true,
    reference: payoutRef,
    transactionId: txn.id,
    newBalance: user.realBalance,
    message: `NovuPay Payout request for ${user.currency} ${numAmount.toFixed(2)} submitted for 1-click admin release!`,
  });
});

// ================= ADMIN DASHBOARD ENDPOINTS =================
app.use('/api/admin', securityFirewall.requireAdmin(activeStaffSessions, adminManager));
app.get('/api/admin/overview', (req, res) => {
  res.json(adminManager.getOverview());
});

app.get('/api/admin/email/status', async (req, res) => {
  const to = (req.query.to as string) || 'support.forexgrow@gmail.com';
  const testRes = await emailService.sendMail({
    to,
    subject: 'Forex Grow: Email Dispatch Health Check',
    html: '<div style="font-family: sans-serif; padding: 20px; background: #0c0f17; color: #fff; border-radius: 8px;"><h2 style="color: #00c679;">FOREX GROW</h2><p>Your transactional email infrastructure is verified and operational!</p></div>'
  });
  res.json({
    success: testRes.success,
    error: testRes.error || null,
    testedRecipient: to,
  });
});

app.get('/api/admin/users', (req, res) => {
  res.json(adminManager.getUsers());
});

app.delete('/api/admin/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  const targetUser = adminManager.getUser(userId);
  const userEmail = targetUser?.email?.toLowerCase();

  const result = await adminManager.deleteUser(userId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Clear trade history from settlement engine
  try {
    settlementEngine.clearUserHistory(userId);
  } catch {}

  // 1. Purge active trader sessions
  if (traderAccountSessions.has(userId)) {
    traderAccountSessions.delete(userId);
  }

  // 2. Clear any pending registration OTP for this email so it can be re-registered immediately
  if (userEmail && pendingRegisterOtps.has(userEmail)) {
    pendingRegisterOtps.delete(userEmail);
  }

  // 3. Force logout active WebSockets for this deleted account
  for (const [clientWs, sess] of clients.entries()) {
    if (sess.userId === userId) {
      try {
        sendToClient(clientWs, {
          type: 'FORCE_LOGOUT',
          targetRole: 'TRADER',
          targetUserId: userId,
          reason: 'This trading account has been deleted by Super Admin.',
        });
        clientWs.close(4003, 'ACCOUNT_DELETED');
      } catch {}
    }
  }

  // 4. Broadcast deletion to all staff dashboards
  broadcast({
    type: 'USER_DELETED',
    userId,
  });

  console.log(`[ADMIN] Trader account ${userId} (${userEmail || 'no-email'}) completely purged from memory, DB, and sessions.`);
  res.json(result);
});

app.delete('/api/manager/users/:userId', (req, res) => {
  return res.status(403).json({
    error: 'Access Denied: Managers do not have permission to delete trader accounts. Only Super Admin has user deletion privileges.'
  });
});

// Admin Password Reset Endpoint
app.post('/api/admin/users/:userId/reset-password', (req, res) => {
  const { newPassword, actorName } = req.body;
  const result = adminManager.resetUserPassword(req.params.userId, newPassword, {
    id: 'admin_root',
    name: actorName || 'Super Admin',
    role: 'ADMIN',
  });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const user = adminManager.getUser(req.params.userId);
  if (user && user.email) {
    emailService.sendMail({
      to: user.email,
      subject: 'Forex Grow: Security Notice - Your Password Has Been Updated',
      html: `
        <div style="background-color: #0c0f17; color: #ffffff; font-family: sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; border-radius: 12px; border: 1px solid #1f2738;">
          <h2 style="color: #00c679; margin: 0;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; text-transform: uppercase;">Security Alert Desk</p>
          <div style="background: #141926; padding: 20px; border-radius: 8px; margin-top: 15px;">
            <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #94a3b8; font-size: 13px;">Your trader account password has been updated by operations desk.</p>
            <div style="background: #090c13; padding: 12px; border-radius: 6px; margin: 15px 0; font-family: monospace; font-size: 16px; color: #f59e0b; font-weight: bold;">
              New Password: ${newPassword}
            </div>
            <p style="color: #64748b; font-size: 11px;">If you did not authorize this change, contact Forex Grow Customer Care immediately.</p>
          </div>
        </div>
      `,
    }).catch(err => console.error('[EMAIL] Failed to send password reset email:', err));
  }

  res.json({ success: true, message: 'Password reset successfully' });
});

// Manager Password Reset Endpoint
app.post('/api/manager/users/:userId/reset-password', (req, res) => {
  const { newPassword, actorName, actorId } = req.body;
  const result = adminManager.resetUserPassword(req.params.userId, newPassword, {
    id: actorId || 'mgr_01',
    name: actorName || 'Operations Manager',
    role: 'MANAGER',
  });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const user = adminManager.getUser(req.params.userId);
  if (user && user.email) {
    emailService.sendMail({
      to: user.email,
      subject: 'Forex Grow: Security Notice - Your Password Has Been Updated',
      html: `
        <div style="background-color: #0c0f17; color: #ffffff; font-family: sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; border-radius: 12px; border: 1px solid #1f2738;">
          <h2 style="color: #00c679; margin: 0;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; text-transform: uppercase;">Security Alert Desk</p>
          <div style="background: #141926; padding: 20px; border-radius: 8px; margin-top: 15px;">
            <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #94a3b8; font-size: 13px;">Your trader account password has been updated by operations desk.</p>
            <div style="background: #090c13; padding: 12px; border-radius: 6px; margin: 15px 0; font-family: monospace; font-size: 16px; color: #f59e0b; font-weight: bold;">
              New Password: ${newPassword}
            </div>
            <p style="color: #64748b; font-size: 11px;">If you did not authorize this change, contact Forex Grow Customer Care immediately.</p>
          </div>
        </div>
      `,
    }).catch(err => console.error('[EMAIL] Failed to send password reset email:', err));
  }

  res.json({ success: true, message: 'Password reset successfully' });
});

app.post('/api/admin/users/create', (req, res) => {
  const result = adminManager.createUser(req.body);
  if (!result.success || !result.user) {
    return res.status(400).json({ error: result.error });
  }

  // Send Welcome Email with Client Login ID and Password
  emailService.sendAccountCredentialsEmail({
    toEmail: result.user.email,
    clientName: result.user.name,
    loginId: result.user.id,
    password: req.body.password || result.user.password || 'Trader@2026',
    currency: result.user.currency,
    demoBalance: result.user.demoBalance,
    realBalance: result.user.realBalance,
    vipLevel: result.user.vipLevel,
    isKycVerified: result.user.isKycVerified,
  }).catch((err) => console.error('[EMAIL] Failed to send credentials email on admin create:', err));

  res.json(result);
});

app.post('/api/admin/users/:userId/adjust-balance', (req, res) => {
  const { userId } = req.params;
  const { accountType, action, amount, reason, currency, inputCurrency } = req.body;

  const user = adminManager.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const USD_INR_RATE = 95.0;

  // Strict 2-currency support: INR (default) or USD
  const targetCurrency: 'INR' | 'USD' = currency === 'USD' ? 'USD' : 'INR';
  const fromCurrency: 'INR' | 'USD' = user.currency === 'USD' ? 'USD' : 'INR';

  // 1. If currency is changing between USD and INR, convert existing balances
  if (targetCurrency !== fromCurrency) {
    if (targetCurrency === 'INR' && fromCurrency === 'USD') {
      user.realBalance = Number((user.realBalance * USD_INR_RATE).toFixed(2));
      user.demoBalance = Number((user.demoBalance * USD_INR_RATE).toFixed(2));
    } else if (targetCurrency === 'USD' && fromCurrency === 'INR') {
      user.realBalance = Number((user.realBalance / USD_INR_RATE).toFixed(2));
      user.demoBalance = Number((user.demoBalance / USD_INR_RATE).toFixed(2));
    }
    user.currency = targetCurrency;
    adminManager.updateUser(userId, {
      currency: targetCurrency,
      realBalance: user.realBalance,
      demoBalance: user.demoBalance,
    });
  }

  // 2. Cross-currency auto-calculation:
  // Admin can input in either INR or USD (default: INR)
  const enteredAmount = Math.abs(Number(amount) || 0);
  const effectiveInputCurrency: 'INR' | 'USD' = inputCurrency === 'USD' ? 'USD' : 'INR';

  let adjustedAmount = enteredAmount;
  if (effectiveInputCurrency === 'USD' && targetCurrency === 'INR') {
    adjustedAmount = Number((enteredAmount * USD_INR_RATE).toFixed(2));
  } else if (effectiveInputCurrency === 'INR' && targetCurrency === 'USD') {
    adjustedAmount = Number((enteredAmount / USD_INR_RATE).toFixed(2));
  }

  let result;
  if (adjustedAmount > 0) {
    const auditReason = reason
      ? `${reason} [Input: ${effectiveInputCurrency} ${enteredAmount.toLocaleString()} -> Applied: ${targetCurrency} ${adjustedAmount.toLocaleString()}]`
      : `Admin Adjustment (${effectiveInputCurrency} ${enteredAmount.toLocaleString()} -> ${targetCurrency} ${adjustedAmount.toLocaleString()})`;

    result = adminManager.adjustUserBalance({
      userId,
      accountType: accountType || 'REAL',
      action: action || 'ADD',
      amount: adjustedAmount,
      reason: auditReason,
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
    sendToUser(result.user.id, {
      type: 'BALANCE_UPDATE',
      userId: result.user.id,
      demoBalance: result.user.demoBalance,
      realBalance: result.user.realBalance,
      activeAccountType: result.user.activeAccountType,
      currency: result.user.currency,
    });
  }

  res.json({
    ...result,
    conversion: {
      inputCurrency: effectiveInputCurrency,
      inputAmount: enteredAmount,
      targetCurrency,
      appliedAmount: adjustedAmount,
      rate: USD_INR_RATE,
    },
  });
});

app.post('/api/admin/users/:userId/update', (req, res) => {
  const { userId } = req.params;
  const result = adminManager.updateUser(userId, req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const u = result.user!;
  sendToUser(u.id, {
    type: 'BALANCE_UPDATE',
    userId: u.id,
    demoBalance: u.demoBalance,
    realBalance: u.realBalance,
    activeAccountType: u.activeAccountType,
    currency: u.currency,
    isKycVerified: u.isKycVerified,
    kycStatus: u.kycStatus,
  });

  res.json(result);
});

// ================= EASIEST DIRECT BALANCE EDIT (NO MENTAL MATH) =================
app.post('/api/admin/users/:userId/set-balances', (req, res) => {
  const { userId } = req.params;
  const { realBalance, demoBalance, currency, activeAccountType, actorName } = req.body;
  const user = adminManager.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const prevReal = user.realBalance;
  const prevDemo = user.demoBalance;

  if (realBalance !== undefined && !isNaN(Number(realBalance))) {
    user.realBalance = Math.max(0, Number(Number(realBalance).toFixed(2)));
  }
  if (demoBalance !== undefined && !isNaN(Number(demoBalance))) {
    user.demoBalance = Math.max(0, Number(Number(demoBalance).toFixed(2)));
  }
  if (currency !== undefined) {
    user.currency = currency === 'USD' ? 'USD' : 'INR';
  }
  if (activeAccountType !== undefined) {
    user.activeAccountType = activeAccountType === 'REAL' ? 'REAL' : 'DEMO';
  }
  if (req.body.totalDepositedUSD !== undefined && !isNaN(Number(req.body.totalDepositedUSD))) {
    user.totalDepositedUSD = Math.max(0, Number(Number(req.body.totalDepositedUSD).toFixed(2)));
  }

  adminManager.updateUser(userId, {
    realBalance: user.realBalance,
    demoBalance: user.demoBalance,
    currency: user.currency,
    activeAccountType: user.activeAccountType,
    totalDepositedUSD: user.totalDepositedUSD,
  });

  adminManager.addAuditLog(
    'admin_sys',
    actorName || 'Desk Administrator',
    'MANAGER',
    'DIRECT_BALANCE_UPDATE',
    user.id,
    user.name,
    `Directly set funds: Real ${user.currency} ${prevReal} -> ${user.realBalance}, Demo ${user.currency} ${prevDemo} -> ${user.demoBalance}`
  );

  sendToUser(user.id, {
    type: 'BALANCE_UPDATE',
    userId: user.id,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  res.json({ success: true, user: { ...user } });
});

app.post('/api/manager/users/:userId/set-balances', (req, res) => {
  const { userId } = req.params;
  const { realBalance, demoBalance, currency, activeAccountType, actorName } = req.body;
  const user = adminManager.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const prevReal = user.realBalance;
  const prevDemo = user.demoBalance;

  if (realBalance !== undefined && !isNaN(Number(realBalance))) {
    user.realBalance = Math.max(0, Number(Number(realBalance).toFixed(2)));
  }
  if (demoBalance !== undefined && !isNaN(Number(demoBalance))) {
    user.demoBalance = Math.max(0, Number(Number(demoBalance).toFixed(2)));
  }
  if (currency !== undefined) {
    user.currency = currency === 'USD' ? 'USD' : 'INR';
  }
  if (activeAccountType !== undefined) {
    user.activeAccountType = activeAccountType === 'REAL' ? 'REAL' : 'DEMO';
  }
  if (req.body.totalDepositedUSD !== undefined && !isNaN(Number(req.body.totalDepositedUSD))) {
    user.totalDepositedUSD = Math.max(0, Number(Number(req.body.totalDepositedUSD).toFixed(2)));
  }

  adminManager.updateUser(userId, {
    realBalance: user.realBalance,
    demoBalance: user.demoBalance,
    currency: user.currency,
    activeAccountType: user.activeAccountType,
    totalDepositedUSD: user.totalDepositedUSD,
  });

  adminManager.addAuditLog(
    'manager_desk',
    actorName || 'Operations Manager',
    'MANAGER',
    'DIRECT_BALANCE_UPDATE',
    user.id,
    user.name,
    `Manager directly set funds: Real ${user.currency} ${prevReal} -> ${user.realBalance}, Demo ${user.currency} ${prevDemo} -> ${user.demoBalance}`
  );

  sendToUser(user.id, {
    type: 'BALANCE_UPDATE',
    userId: user.id,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    activeAccountType: user.activeAccountType,
    currency: user.currency,
  });

  res.json({ success: true, user: { ...user } });
});

// Explicit security rule: Manager can NEVER delete transactions
app.delete('/api/manager/transactions/:id', (_req, res) => {
  return res.status(403).json({ error: 'Access Denied: Managers cannot delete deposit or withdrawal records.' });
});

app.get('/api/admin/transactions', (req, res) => {
  res.json(adminManager.getTransactions());
});

app.post('/api/admin/transactions/:id/approve', (req, res) => {
  const result = adminManager.approveTransaction(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const tx = result.transaction!;
  const user = adminManager.getUser(tx.userId);
  if (user) {
    sendToUser(user.id, {
      type: 'BALANCE_UPDATE',
      userId: user.id,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });

    const isDeposit = tx.type === 'DEPOSIT';
    const message = isDeposit
      ? `Deposit of ${tx.currency} ${tx.amount.toLocaleString()} has been approved and credited to your live account!`
      : `Withdrawal of ${tx.currency} ${tx.amount.toLocaleString()} has been approved and processed!`;

    sendToUser(user.id, {
      type: 'TRANSACTION_SUCCESS',
      userId: user.id,
      message,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
    });

    // Automated Security Notification: Dispatch emails
    if (tx.type === 'WITHDRAWAL' && user.email) {
      emailService.sendWithdrawalApprovedEmail(
        user.email,
        user.name,
        tx.amount,
        tx.currency,
        tx.id,
        tx.method
      ).catch(e => console.error('[EMAIL] Failed to dispatch withdrawal approved email:', e));
    } else if (tx.type === 'DEPOSIT' && user.email) {
      emailService.sendDepositApprovedEmail(
        user.email,
        user.name,
        tx.amount,
        tx.currency,
        tx.id,
        user.realBalance
      ).catch(e => console.error('[EMAIL] Failed to dispatch deposit approved email:', e));
    }
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
  if (user) {
    sendToUser(user.id, {
      type: 'BALANCE_UPDATE',
      userId: user.id,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });

    if (user.email) {
      emailService.sendTransactionRejectedEmail(
        user.email,
        user.name,
        result.transaction!.amount,
        result.transaction!.currency,
        result.transaction!.id,
        result.transaction!.type,
        reason
      ).catch(e => console.error('[EMAIL] Failed to dispatch transaction rejected email:', e));
    }
  }

  res.json(result);
});

// Admin-Only: Delete deposit / transaction record and recalculate Total Deposits
app.delete('/api/admin/transactions/:id', (req, res) => {
  const deductBalance = req.query.deductBalance === 'true';
  const result = adminManager.deleteTransaction(req.params.id, deductBalance, {
    id: 'admin_master',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }

  const tx = result.deletedTx!;
  const user = adminManager.getUser(tx.userId);
  if (user) {
    sendToUser(user.id, {
      type: 'BALANCE_UPDATE',
      userId: user.id,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
  }

  broadcast({
    type: 'TRANSACTION_DELETED',
    txId: tx.id,
    userId: tx.userId,
  });

  res.json({ success: true, message: `Transaction ${tx.id} deleted successfully.`, transaction: tx });
});

// Admin-Only: Delete / clear all deposit records for a specific trader
app.delete('/api/admin/users/:userId/deposits', (req, res) => {
  const deductBalance = req.query.deductBalance === 'true';
  const result = adminManager.deleteUserDeposits(req.params.userId, deductBalance, {
    id: 'admin_master',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }

  const user = adminManager.getUser(req.params.userId);
  if (user) {
    sendToUser(user.id, {
      type: 'BALANCE_UPDATE',
      userId: user.id,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
  }

  res.json({ success: true, message: `All deposits cleared for user ${req.params.userId}`, deletedCount: result.deletedCount });
});
app.get('/api/admin/security/audit-logs', (_req: express.Request, res: express.Response) => {
  res.json(securityFirewall.getRecentSecurityLogs());
});

// Public & Client Coupon Validation
app.get('/api/coupons', (_req: express.Request, res: express.Response) => {
  res.json(adminManager.getCoupons().filter((c) => c.isActive));
});

app.post('/api/coupons/validate', (req: express.Request, res: express.Response) => {
  const { code, depositAmount, currency } = req.body;
  const result = adminManager.validateCoupon(
    String(code || ''),
    Number(depositAmount) || 0,
    (currency === 'USD' ? 'USD' : 'INR')
  );
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
  broadcast({ type: 'PAYMENT_SETTINGS_UPDATE', settings: updated });
  res.json({ success: true, settings: updated });
});

// ================= RISK & WIN-RATE ENGINE ENDPOINTS (QUOTEX 20% WIN RATE) =================
app.get('/api/admin/risk/settings', (_req: express.Request, res: express.Response) => {
  res.json({ success: true, settings: adminManager.getRiskSettings() });
});

app.post('/api/admin/risk/settings', (req: express.Request, res: express.Response) => {
  const { actorName, ...settings } = req.body;
  const updated = adminManager.updateRiskSettings(settings, actorName || 'Administrator');
  res.json({ success: true, settings: updated });
});

app.get('/api/manager/risk/settings', (_req: express.Request, res: express.Response) => {
  res.json({ success: true, settings: adminManager.getRiskSettings() });
});

app.post('/api/manager/risk/settings', (req: express.Request, res: express.Response) => {
  const { actorName, ...settings } = req.body;
  const updated = adminManager.updateRiskSettings(settings, actorName || 'Operations Manager');
  res.json({ success: true, settings: updated });
});

// ================= INDIVIDUAL RISK ENGINE ENDPOINTS =================
app.get('/api/manager/users/:userId/risk', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const user = adminManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    success: true,
    customRiskSettings: user.customRiskSettings || {
      enabled: false,
      targetWinRate: 20,
      mode: 'QUOTEX_OTC',
      microPipSniping: true,
    },
    globalRiskSettings: adminManager.getRiskSettings(),
  });
});

app.post('/api/manager/users/:userId/risk', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const { enabled, targetWinRate, mode, microPipSniping, actorName } = req.body;
  const result = adminManager.updateUserCustomRisk(
    userId,
    { enabled, targetWinRate, mode, microPipSniping },
    actorName || 'Operations Manager'
  );
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get('/api/admin/users/:userId/risk', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const user = adminManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    success: true,
    customRiskSettings: user.customRiskSettings || {
      enabled: false,
      targetWinRate: 20,
      mode: 'QUOTEX_OTC',
      microPipSniping: true,
    },
    globalRiskSettings: adminManager.getRiskSettings(),
  });
});

app.post('/api/admin/users/:userId/risk', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const { enabled, targetWinRate, mode, microPipSniping, actorName } = req.body;
  const result = adminManager.updateUserCustomRisk(
    userId,
    { enabled, targetWinRate, mode, microPipSniping },
    actorName || 'Administrator'
  );
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

// ================= KYC ENDPOINTS (AADHAAR BASED) =================
app.post('/api/user/kyc/submit', (req: express.Request, res: express.Response) => {
  const { userId, fullName, aadhaarNumber, dob, gender, frontImage, backImage } = req.body;
  if (!userId || !fullName || !aadhaarNumber) {
    return res.status(400).json({ error: 'User ID, Full Legal Name, and 12-digit Aadhaar Number are required.' });
  }
  if (!frontImage || !backImage) {
    return res.status(400).json({ error: 'Both Front and Back photos of Aadhaar Card are strictly mandatory.' });
  }
  const result = adminManager.submitKycData(String(userId), { fullName, aadhaarNumber, dob, gender, frontImage, backImage });
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/manager/users/:id/kyc/review', (req: express.Request, res: express.Response) => {
  const { isApproved, reason, actorName } = req.body;
  const result = adminManager.reviewKyc(
    String(req.params.id),
    Boolean(isApproved),
    reason,
    actorName || 'Operations Manager'
  );
  if (!result.success) return res.status(400).json({ error: result.error });

  if (result.user) {
    sendToUser(result.user.id, {
      type: 'BALANCE_UPDATE',
      userId: result.user.id,
      demoBalance: result.user.demoBalance,
      realBalance: result.user.realBalance,
      activeAccountType: result.user.activeAccountType,
      currency: result.user.currency,
      isKycVerified: result.user.isKycVerified,
      kycStatus: result.user.kycStatus,
    });
  }

  res.json(result);
});

app.post('/api/admin/users/:id/kyc/review', (req: express.Request, res: express.Response) => {
  const { isApproved, reason, actorName } = req.body;
  const result = adminManager.reviewKyc(
    String(req.params.id),
    Boolean(isApproved),
    reason,
    actorName || 'Administrator'
  );
  if (!result.success) return res.status(400).json({ error: result.error });

  if (result.user) {
    sendToUser(result.user.id, {
      type: 'BALANCE_UPDATE',
      userId: result.user.id,
      demoBalance: result.user.demoBalance,
      realBalance: result.user.realBalance,
      activeAccountType: result.user.activeAccountType,
      currency: result.user.currency,
      isKycVerified: result.user.isKycVerified,
      kycStatus: result.user.kycStatus,
    });
  }

  res.json(result);
});

// ================= BANK DETAILS LOCK & EDIT =================
app.post('/api/user/bank-details', (req: express.Request, res: express.Response) => {
  const { userId, ...details } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  const result = adminManager.saveBankDetails(String(userId), details, false);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/manager/users/:userId/bank-details', (req: express.Request, res: express.Response) => {
  const result = adminManager.saveBankDetails(String(req.params.userId), req.body, true);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/admin/users/:userId/bank-details', (req: express.Request, res: express.Response) => {
  const result = adminManager.saveBankDetails(String(req.params.userId), req.body, true);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

// ================= MANAGER PROMO COUPON ENDPOINTS =================
app.get('/api/manager/coupons', (_req: express.Request, res: express.Response) => {
  res.json(adminManager.getCoupons());
});

app.post('/api/manager/coupons', (req: express.Request, res: express.Response) => {
  const result = adminManager.createCoupon(req.body);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/manager/coupons/:id/toggle', (req: express.Request, res: express.Response) => {
  const result = adminManager.toggleCoupon(String(req.params.id));
  res.json(result);
});

app.delete('/api/manager/coupons/:id', (req: express.Request, res: express.Response) => {
  const success = adminManager.deleteCoupon(String(req.params.id));
  res.json({ success });
});

// ================= MANAGER DESK ENDPOINTS =================
app.get('/api/manager/overview', (req: express.Request, res: express.Response) => {
  res.json(adminManager.getManagerOverview());
});

app.get('/api/manager/users', (req: express.Request, res: express.Response) => {
  // Only Super Admin can view passwords and complete credentials; strip passwords for Manager
  const users = adminManager.getUsers().map((u) => {
    const { password, ...safeUser } = u;
    return safeUser;
  });
  res.json(users);
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
  if (!result.success || !result.user) return res.status(400).json({ error: result.error });

  // Send Welcome Email with Client Login ID and Password
  emailService.sendAccountCredentialsEmail({
    toEmail: result.user.email,
    clientName: result.user.name,
    loginId: result.user.id,
    password: password || result.user.password || 'Trader@2026',
    currency: result.user.currency,
    demoBalance: result.user.demoBalance,
    realBalance: result.user.realBalance,
    vipLevel: result.user.vipLevel,
    isKycVerified: result.user.isKycVerified,
  }).catch((err) => console.error('[EMAIL] Failed to send credentials email on manager create:', err));

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

  if (result.user) {
    sendToUser(result.user.id, {
      type: 'BALANCE_UPDATE',
      userId: result.user.id,
      demoBalance: result.user.demoBalance,
      realBalance: result.user.realBalance,
      activeAccountType: result.user.activeAccountType,
      currency: result.user.currency,
      isKycVerified: result.user.isKycVerified,
      kycStatus: result.user.kycStatus,
    });
  }

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
    sendToUser(user.id, {
      type: 'BALANCE_UPDATE',
      userId: user.id,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });
    sendToUser(user.id, {
      type: 'TRANSACTION_SUCCESS',
      userId: user.id,
      message: `${result.transaction!.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} of ${user.currency} ${(result.transaction!.amount * (user.currency === 'INR' ? 95 : 1)).toFixed(2)} has been approved and processed!`,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
    });

    // Automated Security Notification: Dispatch emails
    if (result.transaction!.type === 'WITHDRAWAL' && user.email) {
      emailService.sendWithdrawalApprovedEmail(
        user.email,
        user.name,
        result.transaction!.amount,
        result.transaction!.currency,
        result.transaction!.id,
        result.transaction!.method
      ).catch(e => console.error('[EMAIL] Failed to dispatch withdrawal approved email:', e));
    } else if (result.transaction!.type === 'DEPOSIT' && user.email) {
      emailService.sendDepositApprovedEmail(
        user.email,
        user.name,
        result.transaction!.amount,
        result.transaction!.currency,
        result.transaction!.id,
        user.realBalance
      ).catch(e => console.error('[EMAIL] Failed to dispatch deposit approved email:', e));
    }
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
    sendToUser(user.id, {
      type: 'BALANCE_UPDATE',
      userId: user.id,
      demoBalance: user.demoBalance,
      realBalance: user.realBalance,
      activeAccountType: user.activeAccountType,
      currency: user.currency,
    });

    if (user.email) {
      emailService.sendTransactionRejectedEmail(
        user.email,
        user.name,
        result.transaction!.amount,
        result.transaction!.currency,
        result.transaction!.id,
        result.transaction!.type,
        reason
      ).catch(e => console.error('[EMAIL] Failed to dispatch transaction rejected email:', e));
    }
  }
  res.json(result);
});

const handleGetAllPlatformTrades = (req: express.Request, res: express.Response) => {
  const allUsers = adminManager.getUsers();
  const allTrades: any[] = [];
  for (const u of allUsers) {
    const userTrades = settlementEngine.getTradesForUser(u.id);
    if (userTrades) {
      const active = (userTrades.activeTrades || []).map((t) => ({
        ...t,
        userName: u.name,
        currency: u.currency || 'INR',
      }));
      const history = (userTrades.tradeHistory || []).map((t) => ({
        ...t,
        userName: u.name,
        currency: u.currency || 'INR',
      }));
      allTrades.push(...active, ...history);
    }
  }
  allTrades.sort((a, b) => b.openTime - a.openTime);
  res.json(allTrades.slice(0, 200));
};

app.get('/api/admin/trades', handleGetAllPlatformTrades);
app.get('/api/manager/trades', handleGetAllPlatformTrades);

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
  broadcast({ type: 'PAYMENT_SETTINGS_UPDATE', settings: updated });
  res.json({ success: true, settings: updated });
});

app.get('/api/admin/payout/status', (_req, res) => {
  res.json({
    fixed99: marketEngine.isFixed99Return(),
    assetsCount: marketEngine.getAssets().length,
  });
});

app.post('/api/admin/assets/payout/bulk', (req, res) => {
  const { payout, fixed99 } = req.body;
  if (typeof fixed99 === 'boolean') {
    marketEngine.setFixed99Return(fixed99);
  } else {
    const numPayout = Math.max(10, Math.min(99, Number(payout) || 99));
    marketEngine.setAllAssetsPayout(numPayout);
  }
  const assets = marketEngine.getAssets();
  broadcast({ type: 'ASSETS_UPDATE', assets });
  res.json({ success: true, fixed99: marketEngine.isFixed99Return(), assets });
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

app.post('/api/manager/assets/:id/payout', (_req, res) => {
  return res.status(403).json({ error: 'Permission denied: Only Super Admin can modify asset payout margins.' });
});

// Admin & Manager Trade Management Endpoints
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
  const user = adminManager.getUser(userId);
  if (user) {
    user.totalTrades = 0;
    adminManager.saveLocalUsers();
    adminManager.persistUser(user);
  }
  res.json({ success: true, count });
});

// Manager Trade Management Endpoints
app.get('/api/manager/users/:userId/trades', (req: express.Request, res: express.Response) => {
  const userId = String(req.params.userId);
  const trades = settlementEngine.getTradesForUser(userId);
  res.json(trades);
});

app.delete('/api/manager/trades/:tradeId', (req: express.Request, res: express.Response) => {
  const tradeId = String(req.params.tradeId);
  const success = settlementEngine.deleteTrade(tradeId);
  res.json({ success });
});

app.delete('/api/manager/users/:userId/trades', (_req: express.Request, res: express.Response) => {
  return res.status(403).json({ error: 'Permission denied: Only Super Admin can delete complete trader trade history. Managers can only delete individual trades.' });
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

marketEngine.on('payout_updated', () => {
  const assets = marketEngine.getAssets();
  broadcast({ type: 'ASSETS_UPDATE', assets });
});

marketEngine.on('payouts_epoch_updated', (assets) => {
  broadcast({ type: 'ASSETS_UPDATE', assets });
});

// Settlement Event Listener
settlementEngine.on('trade_settled', ({ trade, newBalance, userId }) => {
  const targetId = userId || trade.userId;
  if (targetId) {
    sendToUser(targetId, { type: 'TRADE_SETTLED', trade, newBalance });
  }
  sendToStaff({ type: 'TRADE_SETTLED', trade, newBalance });
});

settlementEngine.on('trade_deleted', ({ tradeId, userId }) => {
  if (userId) {
    sendToUser(userId, { type: 'TRADE_DELETED', tradeId, userId });
  }
  sendToStaff({ type: 'TRADE_DELETED', tradeId, userId });
});

settlementEngine.on('user_history_cleared', ({ userId }) => {
  if (userId) {
    sendToUser(userId, { type: 'USER_HISTORY_CLEARED', userId });
  }
  sendToStaff({ type: 'USER_HISTORY_CLEARED', userId });
});

settlementEngine.on('balance_updated', (data) => {
  if (data.userId) {
    sendToUser(data.userId, {
      type: 'BALANCE_UPDATE',
      userId: data.userId,
      demoBalance: data.demoBalance,
      realBalance: data.realBalance,
      activeAccountType: data.activeAccountType,
      currency: data.currency,
    });
  }
});

settlementEngine.on('leaderboard_updated', (leaderboard) => {
  broadcast({ type: 'LEADERBOARD_UPDATE', leaderboard });
});

// WebSocket Connection Handler
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const defaultAsset = 'EURUSD_OTC';
  let queryUserId: string | undefined;
  let queryToken: string | undefined;

  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    queryUserId = url.searchParams.get('userId') || undefined;
    queryToken = url.searchParams.get('token') || undefined;
  } catch (e) {}

  const session: ClientSession = {
    ws,
    subscribedAsset: defaultAsset,
    timeframe: 5,
    userId: queryUserId,
    sessionToken: queryToken,
  };
  clients.set(ws, session);

  const authUserId = session.userId && adminManager.getUser(session.userId) ? session.userId : undefined;
  const userAccount = authUserId ? adminManager.getUser(authUserId)! : undefined;
  const assets = marketEngine.getAssets();
  const activeTrades = authUserId ? settlementEngine.getActiveTrades(undefined, authUserId) : [];
  const tradeHistory = authUserId ? settlementEngine.getTradeHistory(undefined, authUserId) : [];
  const leaderboard = settlementEngine.getLeaderboard();

  if (userAccount) {
    sendToClient(ws, {
      type: 'INIT_STATE',
      account: userAccount,
      assets,
      activeTrades,
      tradeHistory,
      leaderboard,
    });
  } else {
    sendToClient(ws, {
      type: 'INIT_STATE',
      account: {
        id: '',
        name: 'Guest Trader',
        email: '',
        demoBalance: 700000,
        realBalance: 0,
        activeAccountType: 'DEMO',
        currency: 'INR',
        vipLevel: 'STANDARD',
        isKycVerified: false,
        status: 'ACTIVE',
        totalTrades: 0,
        totalDepositedUSD: 0,
      },
      assets,
      activeTrades: [],
      tradeHistory: [],
      leaderboard,
    });
  }

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
        case 'CLIENT_AUTH': {
          if (action.token) session.sessionToken = action.token;
          if (action.userId) {
            session.userId = action.userId;
            const user = adminManager.getUser(action.userId);
            if (user) {
              const { activeTrades, tradeHistory } = settlementEngine.getTradesForUser(action.userId);
              sendToClient(ws, {
                type: 'INIT_STATE',
                account: user,
                assets: marketEngine.getAssets(),
                activeTrades,
                tradeHistory,
                leaderboard: settlementEngine.getLeaderboard(),
              });
            }
          }
          break;
        }
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
          const validated = securityFirewall.validateTradeAmount(action.amount);
          if (!validated.valid) {
            sendToClient(ws, { type: 'ERROR', message: validated.error || 'Invalid trade amount' });
            break;
          }

          const targetUserId = (action as any).userId || session.userId;
          if (!targetUserId) {
            sendToClient(ws, { type: 'ERROR', message: 'Authentication required. Please sign in to trade.' });
            break;
          }
          session.userId = targetUserId;

          const result = settlementEngine.placeTrade({
            userId: targetUserId,
            assetId: action.assetId,
            direction: action.direction,
            amount: validated.amount,
            duration: Math.max(5, Math.min(3600, Number(action.duration) || 30)),
          });

          if ('error' in result) {
            sendToClient(ws, { type: 'ERROR', message: result.error });
          } else {
            sendToUser(targetUserId, {
              type: 'TRADE_OPENED',
              trade: result.trade,
              newBalance: result.newBalance,
            });
            sendToStaff({
              type: 'TRADE_OPENED',
              trade: result.trade,
              newBalance: result.newBalance,
            });
          }
          break;
        }

        case 'SWITCH_ACCOUNT': {
          const targetUserId = (action as any).userId || session.userId;
          if (targetUserId) {
            session.userId = targetUserId;
            const updated = settlementEngine.switchAccountType(action.accountType, targetUserId);
            sendToUser(targetUserId, {
              type: 'BALANCE_UPDATE',
              userId: targetUserId,
              demoBalance: updated.demoBalance,
              realBalance: updated.realBalance,
              activeAccountType: updated.activeAccountType,
              currency: updated.currency,
            });
          }
          break;
        }

        case 'SWITCH_CURRENCY': {
          const targetUserId = (action as any).userId || session.userId;
          if (targetUserId) {
            session.userId = targetUserId;
            const updated = settlementEngine.switchCurrency(action.currency, targetUserId);
            sendToUser(targetUserId, {
              type: 'BALANCE_UPDATE',
              userId: targetUserId,
              demoBalance: updated.demoBalance,
              realBalance: updated.realBalance,
              activeAccountType: updated.activeAccountType,
              currency: updated.currency,
            });
          }
          break;
        }

        case 'RESET_DEMO_BALANCE': {
          const targetUserId = (action as any).userId || session.userId;
          if (targetUserId) {
            session.userId = targetUserId;
            const updated = settlementEngine.resetDemoBalance(targetUserId);
            sendToUser(targetUserId, {
              type: 'BALANCE_UPDATE',
              userId: targetUserId,
              demoBalance: updated.demoBalance,
              realBalance: updated.realBalance,
              activeAccountType: updated.activeAccountType,
              currency: updated.currency,
            });
          }
          break;
        }

        case 'DEPOSIT_FUNDS': {
          const targetUserId = (action as any).userId || session.userId;
          if (targetUserId) session.userId = targetUserId;
          const res = settlementEngine.depositFunds(action.amount, action.promoCode, targetUserId);
          const acc = settlementEngine.getAccount(targetUserId);
          sendToClient(ws, {
            type: 'TRANSACTION_SUCCESS',
            message: res.message,
            demoBalance: acc.demoBalance,
            realBalance: acc.realBalance,
          });
          break;
        }

        case 'WITHDRAW_FUNDS': {
          const targetUserId = (action as any).userId || session.userId;
          if (targetUserId) session.userId = targetUserId;
          const res = settlementEngine.withdrawFunds(action.amount, action.address, targetUserId);
          const acc = settlementEngine.getAccount(targetUserId);
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
            session.userId = action.userId;
            const user = adminManager.getUser(action.userId);
            if (user) {
              const { activeTrades, tradeHistory } = settlementEngine.getTradesForUser(action.userId);
              sendToClient(ws, {
                type: 'INIT_STATE',
                account: user,
                assets: marketEngine.getAssets(),
                activeTrades,
                tradeHistory,
                leaderboard: settlementEngine.getLeaderboard(),
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
