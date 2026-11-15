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

    // 1. Try Brevo REST API if API Key is available
    if (this.config.apiKey) {
      try {
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
        });

        const data: any = await res.json();
        if (res.ok) {
          console.log(`[EMAIL] Sent successfully via Brevo REST API to ${to}:`, data.messageId);
          return { success: true };
        } else {
          lastError = data.message || JSON.stringify(data);
          if (data.code === 'unauthorized' || (data.message && data.message.includes('unrecognised IP address'))) {
            console.error(`[EMAIL ALERT] ⚠️ Brevo rejected request due to IP Restriction! To fix: Open https://app.brevo.com/security/authorised_ips and disable IP restrictions to allow Render cloud IPs.`);
          } else {
            console.warn('[EMAIL] Brevo REST API error:', data);
          }
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn('[EMAIL] Failed sending via Brevo API:', err.message);
      }
    }

    // 2. Try SMTP Transporter (Brevo SMTP Relay)
    if (this.transporter && this.config.smtpPass) {
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
}

export const emailService = new EmailService();
