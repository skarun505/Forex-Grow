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

        const data = await res.json();
        if (res.ok) {
          console.log(`[EMAIL] Sent successfully via Brevo REST API to ${to}:`, data.messageId);
          return { success: true };
        } else {
          console.warn('[EMAIL] Brevo REST API error:', data);
        }
      } catch (err: any) {
        console.warn('[EMAIL] Failed sending via Brevo API:', err.message);
      }
    }

    // 2. Try SMTP Transporter
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
        console.error('[EMAIL] SMTP send error:', err.message);
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'No email transport configured' };
  }

  /**
   * Send 6-Digit Email OTP for 1st-Time Trader Registration
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
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">Use the one-time verification code below to complete your trader account registration:</p>

          <div style="background: #090c13; border: 2px dashed #00c679; border-radius: 10px; padding: 16px; margin: 24px 0;">
            <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #00c679; font-family: monospace;">${otpCode}</span>
          </div>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #475569; font-size: 11px;">
          &copy; ${new Date().getFullYear()} Forex Grow Operations Desk. All rights reserved.
        </div>
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

        <div style="text-align: center; margin-top: 24px; color: #475569; font-size: 11px;">
          &copy; ${new Date().getFullYear()} Forex Grow Operations Desk.
        </div>
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

        <div style="text-align: center; margin-top: 24px; color: #475569; font-size: 11px;">
          &copy; ${new Date().getFullYear()} Forex Grow Operations Desk.
        </div>
      </div>
    `;

    return this.sendMail({ to: toEmail, subject, html });
  }
}

export const emailService = new EmailService();
