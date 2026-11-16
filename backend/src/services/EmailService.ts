import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Robust dotenv loading covering repository root, backend folder, and current working directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
}

class EmailService {
  private config: EmailConfig = {};
  private transporter: Transporter | null = null;

  constructor() {
    this.refreshConfig();
    this.initTransporter();
  }

  public refreshConfig() {
    this.config = {
      smtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      smtpPort: Number(process.env.BREVO_SMTP_PORT) || 587,
      smtpUser: process.env.BREVO_SMTP_USER || 'c341fb001@smtp-brevo.com',
      smtpPass: process.env.BREVO_SMTP_PASS || '',
      apiKey: process.env.BREVO_API_KEY || '',
      senderEmail: process.env.SENDER_EMAIL || 'support.forexgrow@gmail.com',
      senderName: process.env.SENDER_NAME || 'Forex Grow Official Desk',
    };
  }

  public updateConfig(newConfig: Partial<EmailConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initTransporter();
  }

  private initTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false, // TLS
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 3000,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPass,
        },
      });
    } catch (err) {
      console.error('[EMAIL] Failed to initialize Nodemailer transporter:', err);
    }
  }

  /**
   * Dispatch an email via Brevo REST API or fallback to Nodemailer SMTP
   */
  public async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.refreshConfig();
    const { to, subject, html, text } = options;
    let lastError = 'No email transport configured';
    let brevoIpBlocked = false;

    // 1. Try Brevo REST API if API Key is available
    if (this.config.apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            sender: {
              name: this.config.senderName,
              email: this.config.senderEmail,
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html,
            textContent: text || subject,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data: any = await res.json();
        if (res.ok) {
          console.log(`[EMAIL] Sent successfully via Brevo REST API to ${to}:`, data.messageId);
          return { success: true };
        } else {
          lastError = data.message || JSON.stringify(data);
          if (data.code === 'unauthorized' || (data.message && data.message.includes('unrecognised IP address'))) {
            brevoIpBlocked = true;
            console.error(`[EMAIL ALERT] ⚠️ Brevo rejected request due to IP Restriction! To fix: Open https://app.brevo.com/security/authorised_ips and disable IP restrictions to allow Render cloud IPs.`);
          } else {
            console.warn('[EMAIL] Brevo REST API error:', data);
          }
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn('[EMAIL] Brevo API attempt finished:', err.message);
      }
    }

    // 2. Try SMTP Transporter (Brevo SMTP Relay) ONLY if IP was not blocked by Brevo API
    if (!brevoIpBlocked && this.transporter && this.config.smtpPass) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.config.senderName}" <${this.config.senderEmail}>`,
          to,
          subject,
          html,
          text: text || subject,
        });
        console.log(`[EMAIL] Sent successfully via SMTP to ${to}:`, info.messageId);
        return { success: true };
      } catch (err: any) {
        lastError = err.message;
        console.error('[EMAIL] SMTP send error:', err.message);
      }
    }

    // 3. Fallback to Gmail SMTP if configured
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
    const gmailUser = process.env.GMAIL_USER || this.config.senderEmail;
    if (gmailPass) {
      try {
        const gmailTransporter = nodemailer.createTransport({
          service: 'gmail',
          connectionTimeout: 3000,
          greetingTimeout: 3000,
          socketTimeout: 3000,
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });
        const info = await gmailTransporter.sendMail({
          from: `"${this.config.senderName}" <${gmailUser}>`,
          to,
          subject,
          html,
          text: text || subject,
        });
        console.log(`[EMAIL] Sent successfully via Gmail SMTP fallback to ${to}:`, info.messageId);
        return { success: true };
      } catch (err: any) {
        lastError = err.message;
        console.error('[EMAIL] Gmail SMTP fallback error:', err.message);
      }
    }

    return { success: false, error: lastError };
  }

  private getLegalEmailFooterHtml(): string {
    const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:4000';
    return `
      <div style="border-top: 1px solid #1e2638; margin-top: 24px; padding-top: 16px; text-align: center; color: #64748b; font-size: 10px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 6px 0; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9px;">
          ⚖️ Binding Terms, Risk Warning & OTP Acceptance
        </p>
        <p style="margin: 0 0 8px 0; color: #94a3b8;">
          By providing this One-Time Password (OTP) to your account manager or entering it on the terminal, you confirm you are at least 18 years old and unconditionally accept Forex Grow's 
          <a href="${baseUrl}/terms" style="color: #38bdf8; text-decoration: underline;">Terms of Service</a>, 
          <a href="${baseUrl}/privacy" style="color: #38bdf8; text-decoration: underline;">Privacy Policy</a>, 
          <a href="${baseUrl}/refund-policy" style="color: #38bdf8; text-decoration: underline;">Return & Refund Policy</a>, and 
          <a href="${baseUrl}/legal" style="color: #38bdf8; text-decoration: underline;">Risk Disclosure</a>.
        </p>
        <p style="margin: 0 0 8px 0; color: #cbd5e1; font-size: 9.5px;">
          <strong>High-Risk Warning:</strong> Trading digital contracts and OTC foreign exchange involves substantial risk of capital loss. Instantaneous market outcomes are final. You may lose up to 100% of your invested capital. All deposits and executed trades are strictly non-refundable once placed in the market. Payouts require verified Aadhaar identity and matching beneficiary bank account.
        </p>
        <p style="margin: 0 0 6px 0; color: #38bdf8; font-size: 9.5px;">
          <strong>Customer Care Desk (Phone & WhatsApp):</strong> +91 9180169771 | <strong>Official Support:</strong> support.forexgrow@gmail.com
        </p>
        <p style="margin: 0; color: #475569; font-size: 9px;">
          &copy; ${new Date().getFullYear()} Forex Grow Institutional Markets Ltd. All rights reserved. Do not disclose this OTP to unauthorized third parties.
        </p>
      </div>
    `;
  }

  /**
   * Send 6-Digit Email OTP for 1st-Time Trader Registration & Login
   */
  public async sendOtpEmail(toEmail: string, otpCode: string, traderName: string = 'Trader'): Promise<{ success: boolean; error?: string }> {
    const subject = `Your Forex Grow Security Code: ${otpCode}`;
    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Trading Terminal & Security Desk</p>
        </div>

        <div style="background: #141926; border: 1px solid #232c40; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #94a3b8; font-size: 14px; margin-top: 0;">Hello <strong>${traderName}</strong>,</p>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">Use the one-time verification code below to authorize your account:</p>

          <div style="background: #090c13; border: 2px dashed #00c679; border-radius: 10px; padding: 16px; margin: 24px 0;">
            <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #00c679; font-family: monospace;">${otpCode}</span>
          </div>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * Send Withdrawal Request Confirmation Email to Trader
   */
  public async sendWithdrawalRequestedEmail(
    toEmail: string,
    traderName: string,
    amount: number,
    currency: string,
    txnId: string,
    payoutMethod: string
  ): Promise<{ success: boolean; error?: string }> {
    const symbol = currency === 'INR' ? '₹' : '$';
    const formattedAmount = `${symbol}${amount.toLocaleString('en-IN')}`;
    const subject = `Withdrawal Request Received: ${formattedAmount} [${txnId}]`;

    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 24px; font-weight: 900;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Cashier & Payout Vault</p>
        </div>

        <div style="background: #141926; border: 1px solid #232c40; border-radius: 12px; padding: 24px;">
          <h3 style="color: #f59e0b; font-size: 18px; margin-top: 0; display: flex; align-items: center;">
            ⏳ Withdrawal Request Pending Review
          </h3>
          <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${traderName}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">We have received your payout request. Our cashier settlement desk is currently reviewing the transaction.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Requested Amount:</td>
              <td style="padding: 10px 0; color: #ffffff; font-weight: 900; text-align: right; font-size: 16px;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Transaction ID:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-family: monospace; text-align: right;">${txnId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Payout Method:</td>
              <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${payoutMethod}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Status:</td>
              <td style="padding: 10px 0; color: #f59e0b; font-weight: bold; text-align: right;">AWAITING APPROVAL</td>
            </tr>
          </table>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">You will receive an automated confirmation email as soon as the funds are approved and dispatched.</p>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * Send Withdrawal Approved & Paid Email to Trader
   */
  public async sendWithdrawalApprovedEmail(
    toEmail: string,
    traderName: string,
    amount: number,
    currency: string,
    txnId: string,
    payoutMethod: string
  ): Promise<{ success: boolean; error?: string }> {
    const symbol = currency === 'INR' ? '₹' : '$';
    const formattedAmount = `${symbol}${amount.toLocaleString('en-IN')}`;
    const subject = `Withdrawal Approved & Released: ${formattedAmount} [${txnId}]`;

    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 24px; font-weight: 900;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Cashier & Payout Vault</p>
        </div>

        <div style="background: #141926; border: 1px solid #00c679/30; border-radius: 12px; padding: 24px;">
          <h3 style="color: #00c679; font-size: 18px; margin-top: 0;">
            ✓ Withdrawal Approved & Released!
          </h3>
          <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${traderName}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">Great news! Your payout has been approved by the desk manager and processed through banking clearance.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Released Amount:</td>
              <td style="padding: 10px 0; color: #00c679; font-weight: 900; text-align: right; font-size: 18px;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Transaction Reference:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-family: monospace; text-align: right;">${txnId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Payout Destination:</td>
              <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${payoutMethod}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Status:</td>
              <td style="padding: 10px 0; color: #00c679; font-weight: bold; text-align: right;">COMPLETED / RELEASED</td>
            </tr>
          </table>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Depending on your bank, IMPS/UPI transfers credit within 5-15 minutes.</p>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * Send Deposit Proof Submission Confirmation Email to Trader
   */
  public async sendDepositSubmittedEmail(
    toEmail: string,
    traderName: string,
    amount: number,
    currency: string,
    txnId: string,
    utrNumber: string,
    method: string
  ): Promise<{ success: boolean; error?: string }> {
    const symbol = currency === 'INR' ? '₹' : '$';
    const formattedAmount = `${symbol}${amount.toLocaleString('en-IN')}`;
    const subject = `Deposit Request Received: ${formattedAmount} [${txnId}]`;

    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 24px; font-weight: 900;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Cashier & Deposit Settlement Desk</p>
        </div>

        <div style="background: #141926; border: 1px solid #232c40; border-radius: 12px; padding: 24px;">
          <h3 style="color: #38bdf8; font-size: 18px; margin-top: 0;">
            ⏳ Deposit Proof Received - Under Review
          </h3>
          <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${traderName}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">We have received your payment proof and UTR reference number. Our cashier operations desk is verifying the payment with bank clearance.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Deposit Amount:</td>
              <td style="padding: 10px 0; color: #00c679; font-weight: 900; text-align: right; font-size: 16px;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">UTR / Reference No:</td>
              <td style="padding: 10px 0; color: #ffffff; font-family: monospace; text-align: right; font-weight: bold;">${utrNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Transaction ID:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-family: monospace; text-align: right;">${txnId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Payment Rail:</td>
              <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${method}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Status:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-weight: bold; text-align: right;">VERIFYING UTR</td>
            </tr>
          </table>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Once confirmed by our finance manager, the funds will be credited directly to your Live Real Balance instantly.</p>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * Send Deposit Approved & Credited Email to Trader
   */
  public async sendDepositApprovedEmail(
    toEmail: string,
    traderName: string,
    amount: number,
    currency: string,
    txnId: string,
    newBalance: number
  ): Promise<{ success: boolean; error?: string }> {
    const symbol = currency === 'INR' ? '₹' : '$';
    const formattedAmount = `${symbol}${amount.toLocaleString('en-IN')}`;
    const formattedBalance = `${symbol}${newBalance.toLocaleString('en-IN')}`;
    const subject = `Deposit Approved & Credited: ${formattedAmount} [${txnId}]`;

    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 24px; font-weight: 900;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Cashier & Settlement Vault</p>
        </div>

        <div style="background: #141926; border: 1px solid #00c679/30; border-radius: 12px; padding: 24px;">
          <h3 style="color: #00c679; font-size: 18px; margin-top: 0;">
            ✓ Deposit Approved & Credited!
          </h3>
          <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${traderName}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">Your deposit payment has been verified by the desk manager and successfully credited to your Live Real Balance!</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Credited Amount:</td>
              <td style="padding: 10px 0; color: #00c679; font-weight: 900; text-align: right; font-size: 18px;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">New Live Real Balance:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-weight: 900; text-align: right; font-size: 16px;">${formattedBalance}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Transaction Reference:</td>
              <td style="padding: 10px 0; color: #ffffff; font-family: monospace; text-align: right;">${txnId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Status:</td>
              <td style="padding: 10px 0; color: #00c679; font-weight: bold; text-align: right;">COMPLETED / CREDITED</td>
            </tr>
          </table>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">You can now open live positions directly on the trading terminal.</p>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * Send Transaction Rejected Email to Trader (Deposit or Withdrawal)
   */
  public async sendTransactionRejectedEmail(
    toEmail: string,
    traderName: string,
    amount: number,
    currency: string,
    txnId: string,
    type: 'DEPOSIT' | 'WITHDRAWAL',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const symbol = currency === 'INR' ? '₹' : '$';
    const formattedAmount = `${symbol}${amount.toLocaleString('en-IN')}`;
    const isWithdrawal = type === 'WITHDRAWAL';
    const actionLabel = isWithdrawal ? 'Withdrawal Request' : 'Deposit Submission';
    const subject = `${actionLabel} Declined: ${formattedAmount} [${txnId}]`;

    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 24px; font-weight: 900;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase;">Cashier & Settlement Desk</p>
        </div>

        <div style="background: #141926; border: 1px solid #ef4444/30; border-radius: 12px; padding: 24px;">
          <h3 style="color: #ef4444; font-size: 18px; margin-top: 0;">
            ✕ ${actionLabel} Declined
          </h3>
          <p style="color: #cbd5e1; font-size: 14px;">Hello <strong>${traderName}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">Your recent ${type.toLowerCase()} transaction has been declined by the compliance settlement desk.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Amount:</td>
              <td style="padding: 10px 0; color: #ffffff; font-weight: 900; text-align: right; font-size: 16px;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Transaction Reference:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-family: monospace; text-align: right;">${txnId}</td>
            </tr>
            ${reason ? `
            <tr style="border-bottom: 1px solid #222a3d;">
              <td style="padding: 10px 0; color: #64748b;">Decline Reason:</td>
              <td style="padding: 10px 0; color: #f87171; text-align: right; font-weight: bold;">${reason}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Status:</td>
              <td style="padding: 10px 0; color: #ef4444; font-weight: bold; text-align: right;">DECLINED</td>
            </tr>
          </table>

          ${isWithdrawal ? '<p style="color: #a3e635; font-size: 12px;">Notice: The requested withdrawal amount has been refunded back to your live real balance.</p>' : ''}
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">For assistance or clarification, please reach out to our Customer Care team with your transaction reference.</p>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * Send Official Account Onboarding & Credentials Slip to Client
   */
  public async sendAccountCredentialsEmail(params: {
    toEmail: string;
    clientName: string;
    loginId: string;
    password?: string;
    currency?: string;
    demoBalance?: number;
    realBalance?: number;
    vipLevel?: string;
    isKycVerified?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const {
      toEmail,
      clientName,
      loginId,
      password = 'Trader@2026',
      currency = 'INR',
      demoBalance = 700000,
      realBalance = 0,
      vipLevel = 'STANDARD',
      isKycVerified = false,
    } = params;

    const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://forex-grow.onrender.com';
    const loginUrl = `${baseUrl}/login`;
    const currSymbol = currency === 'USD' ? '$' : '₹';
    const formattedDemo = `${currSymbol}${Number(demoBalance).toLocaleString('en-IN')}`;
    const formattedReal = `${currSymbol}${Number(realBalance).toLocaleString('en-IN')}`;

    const subject = `Welcome to Forex Grow: Your Trading Credentials [Login ID: ${loginId}]`;

    const html = `
      <div style="background-color: #0c0f17; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 540px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2738;">
        <!-- Header Branding -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #00c679; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">FOREX GROW</h2>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Official Account Onboarding & Trading Credentials</p>
        </div>

        <div style="background: #141926; border: 1px solid #232c40; border-radius: 12px; padding: 24px;">
          <div style="display: inline-block; background: rgba(0, 198, 121, 0.1); border: 1px solid rgba(0, 198, 121, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 16px;">
            <span style="color: #00c679; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">✓ Account Activated</span>
          </div>

          <h3 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 8px;">
            Welcome to the Trading Floor, ${clientName}!
          </h3>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-top: 0;">
            Your Forex Grow institutional binary trading account has been successfully generated. Below are your official login credentials and account specifications:
          </p>

          <!-- Credentials Card -->
          <div style="background: #0b0e15; border: 1px solid #1e2638; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Trader Name:</td>
                <td style="padding: 10px 0; color: #ffffff; font-weight: bold; text-align: right;">${clientName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Login ID / User ID:</td>
                <td style="padding: 10px 0; color: #38bdf8; font-family: monospace; font-size: 14px; font-weight: bold; text-align: right;">${loginId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Registered Email:</td>
                <td style="padding: 10px 0; color: #cbd5e1; font-family: monospace; text-align: right;">${toEmail}</td>
              </tr>
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Password:</td>
                <td style="padding: 10px 0; color: #00c679; font-family: monospace; font-size: 15px; font-weight: 900; text-align: right; letter-spacing: 0.5px;">${password}</td>
              </tr>
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Practice Demo Capital:</td>
                <td style="padding: 10px 0; color: #f59e0b; font-weight: 900; text-align: right; font-size: 14px;">${formattedDemo}</td>
              </tr>
              ${realBalance > 0 ? `
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Live Real Balance:</td>
                <td style="padding: 10px 0; color: #00c679; font-weight: 900; text-align: right; font-size: 14px;">${formattedReal}</td>
              </tr>
              ` : ''}
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Base Currency:</td>
                <td style="padding: 10px 0; color: #cbd5e1; font-weight: bold; text-align: right;">${currency}</td>
              </tr>
              <tr style="border-bottom: 1px solid #171d2b;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">VIP Tier:</td>
                <td style="padding: 10px 0; color: #a855f7; font-weight: bold; text-align: right;">${vipLevel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">KYC Status:</td>
                <td style="padding: 10px 0; color: ${isKycVerified ? '#00c679' : '#f59e0b'}; font-weight: bold; text-align: right;">
                  ${isKycVerified ? 'VERIFIED' : 'PENDING REVIEW'}
                </td>
              </tr>
            </table>
          </div>

          <!-- Direct Login Call to Action -->
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="${loginUrl}" style="background-color: #00c679; color: #0a0d14; text-decoration: none; font-size: 14px; font-weight: 900; padding: 14px 28px; border-radius: 8px; display: inline-block; letter-spacing: 0.3px;">
              Launch Trading Terminal & Log In →
            </a>
            <p style="color: #64748b; font-size: 11px; margin-top: 10px;">
              Direct Link: <a href="${loginUrl}" style="color: #38bdf8; text-decoration: underline;">${loginUrl}</a>
            </p>
          </div>

          <!-- Security Recommendations -->
          <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px 16px; margin-top: 20px;">
            <p style="color: #f59e0b; font-size: 11px; margin: 0; line-height: 1.5;">
              <strong>Security Advice:</strong> Please keep your credentials strictly confidential. For enhanced security, you can update your password at any time inside your terminal's Profile Settings.
            </p>
          </div>

          <!-- Contact Support Box -->
          <div style="background: #090c13; border: 1px solid #1a2233; border-radius: 8px; padding: 14px; margin-top: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0 0 4px 0;">Need help or have questions about trading?</p>
            <p style="color: #38bdf8; font-size: 12px; font-weight: bold; margin: 0;">
              WhatsApp & Phone Support: <a href="https://wa.me/919180169771" style="color: #38bdf8; text-decoration: none;">+91 9180169771</a>
            </p>
            <p style="color: #64748b; font-size: 10px; margin: 4px 0 0 0;">Official Support Email: support.forexgrow@gmail.com</p>
          </div>
        </div>

        ${this.getLegalEmailFooterHtml()}
      </div>
    `;

    const text = `
Welcome to Forex Grow, ${clientName}!

Your trading account has been created successfully.

Login ID: ${loginId}
Email: ${toEmail}
Password: ${password}
Demo Practice Balance: ${formattedDemo}
Currency: ${currency}
Login URL: ${loginUrl}

Customer Support: +91 9180169771
Email: support.forexgrow@gmail.com
    `.trim();

    return this.sendMail({ to: toEmail, subject, html, text });
  }
}

export const emailService = new EmailService();
