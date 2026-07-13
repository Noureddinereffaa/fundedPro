import nodemailer from 'nodemailer'
import { config } from '../config/index.js'

const transporter = config.SMTP_HOST
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: Number(config.SMTP_PORT || 587),
      secure: false,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    })
  : null

// ── Shared email layout ─────────────────────────────────────────────────────
function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0e17;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e17;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a237e 0%,#0d47a1 100%);padding:32px 40px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Pro FundX</h1>
              <p style="margin:4px 0 0;color:#90caf9;font-size:13px;">Professional Funded Trading Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#111827;padding:32px 40px;border-left:1px solid #1f2937;border-right:1px solid #1f2937;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0d1117;padding:20px 40px;border-radius:0 0 12px 12px;border:1px solid #1f2937;border-top:none;">
              <p style="margin:0;color:#4b5563;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} Pro FundX. All rights reserved.<br/>
                <span style="color:#374151;">This is an automated message — please do not reply.</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;color:#e0e0e0;font-size:20px;font-weight:600;">${text}</h2>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;color:#9ca3af;font-size:14px;line-height:1.6;">${text}</p>`
}

function badge(label: string, value: string, color = '#2563eb'): string {
  return `
  <tr>
    <td style="padding:10px 16px;border-bottom:1px solid #1f2937;">
      <span style="color:#6b7280;font-size:12px;">${label}</span>
      <br/><strong style="color:${color};font-size:15px;">${value}</strong>
    </td>
  </tr>`
}

function ctaButton(text: string, url: string): string {
  return `
  <div style="margin:24px 0;">
    <a href="${url.replace(/"/g, '&quot;')}"
       style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;
              text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      ${text}
    </a>
  </div>`
}

function alert(text: string, type: 'success' | 'warning' | 'error' = 'warning'): string {
  const colors = {
    success: { bg: '#064e3b', border: '#10b981', text: '#6ee7b7' },
    warning: { bg: '#451a03', border: '#f59e0b', text: '#fbbf24' },
    error:   { bg: '#450a0a', border: '#ef4444', text: '#fca5a5' },
  }
  const c = colors[type]
  return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;color:${c.text};font-size:13px;">${text}</p>
  </div>`
}

// ── EmailService ─────────────────────────────────────────────────────────────
export class EmailService {
  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!transporter) return
    await transporter.sendMail({
      from: '"Pro FundX" <noreply@pro-fundx.com>',
      to,
      subject,
      html,
    })
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const body = `
      ${heading('Welcome to Pro FundX! 🎉')}
      ${paragraph(`Hi <strong style="color:#e0e0e0;">${escapeHtml(name)}</strong>,`)}
      ${paragraph('Thank you for joining Pro FundX — the professional funded trading platform. Your account has been created and is ready to go.')}
      ${paragraph('To get started, verify your email address and then explore our evaluation plans.')}
      ${ctaButton('Go to Dashboard', `${config.CLIENT_URL}/dashboard`)}
      ${paragraph('If you did not create this account, you can safely ignore this email.')}
    `
    await this.send(email, 'Welcome to Pro FundX! 🎉', layout('Welcome', body))
  }

  async sendVerification(email: string, token: string): Promise<void> {
    const url = `${config.CLIENT_URL}/en/verify-email/${token}`
    const body = `
      ${heading('Verify Your Email Address')}
      ${paragraph('Click the button below to verify your email. This link will expire in <strong style="color:#e0e0e0;">24 hours</strong>.')}
      ${ctaButton('Verify Email', url)}
      ${alert('If you did not request this, please ignore this email. Your account will not be affected.', 'warning')}
      <p style="margin:16px 0 0;color:#4b5563;font-size:12px;">Or copy this URL into your browser:<br/>
        <span style="color:#3b82f6;word-break:break-all;">${url}</span>
      </p>
    `
    await this.send(email, 'Verify your email — Pro FundX', layout('Verify Email', body))
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const url = `${config.CLIENT_URL}/en/reset-password/${token}`
    const body = `
      ${heading('Reset Your Password 🔑')}
      ${paragraph('You requested a password reset. Click the button below — this link expires in <strong style="color:#e0e0e0;">1 hour</strong>.')}
      ${ctaButton('Reset Password', url)}
      ${alert('If you did not request a password reset, your account may be at risk. Change your password immediately.', 'error')}
      <p style="margin:16px 0 0;color:#4b5563;font-size:12px;">Or copy this URL:<br/>
        <span style="color:#3b82f6;word-break:break-all;">${url}</span>
      </p>
    `
    await this.send(email, 'Reset your password — Pro FundX', layout('Password Reset', body))
  }

  async sendAccountCreated(email: string, account: any): Promise<void> {
    const body = `
      ${heading('Your Trading Account is Ready! 📊')}
      ${paragraph('Congratulations! Your funded trading account has been created. Here are your account details:')}
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0d1117;border:1px solid #1f2937;border-radius:8px;margin:16px 0;overflow:hidden;">
        ${badge('Account Size', `$${Number(account.accountSize).toLocaleString()}`, '#22c55e')}
        ${badge('Phase', escapeHtml(account.phase || account.accountType || ''), '#3b82f6')}
        ${badge('Platform', escapeHtml(account.platform || 'Pro FundX'), '#e0e0e0')}
        ${account.login ? badge('Login ID', escapeHtml(account.login), '#e0e0e0') : ''}
      </table>
      ${alert('Your account password is only shown on the dashboard for security reasons. Log in to view it.', 'warning')}
      ${ctaButton('View Account', `${config.CLIENT_URL}/dashboard`)}
      ${paragraph('Start trading and work toward your profit target. Good luck!')}
    `
    await this.send(email, '🎉 Your trading account is ready — Pro FundX', layout('Account Created', body))
  }

  async sendPayoutProcessed(email: string, amount: number, status: string): Promise<void> {
    const isSuccess = status === 'completed'
    const body = `
      ${heading(`Payout ${isSuccess ? 'Processed ✅' : 'Update'}`)}
      ${paragraph(`Your payout request of <strong style="color:#e0e0e0;">$${amount.toFixed(2)}</strong> has been <strong style="color:${isSuccess ? '#22c55e' : '#f59e0b'};">${escapeHtml(status)}</strong>.`)}
      ${isSuccess
        ? alert('Funds have been sent to your wallet. Processing time depends on network conditions.', 'success')
        : alert(`Your payout status has been updated to: ${status}`, 'warning')
      }
      ${ctaButton('View Payout History', `${config.CLIENT_URL}/payout`)}
    `
    await this.send(email, `Payout ${status} — Pro FundX`, layout('Payout Update', body))
  }

  async sendSLTPHit(email: string, symbol: string, side: string, reason: string, price: number, pnl: number): Promise<void> {
    const isSL = reason === 'stop_loss'
    const direction = isSL ? '🔴 Stop Loss Hit' : '🟢 Take Profit Hit'
    const pnlColor = pnl >= 0 ? '#22c55e' : '#ef4444'
    const body = `
      ${heading(direction)}
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0d1117;border:1px solid #1f2937;border-radius:8px;margin:16px 0;overflow:hidden;">
      ${badge('Symbol', escapeHtml(symbol))}
      ${badge('Direction', escapeHtml(side.toUpperCase()))}
      ${badge('Exit Price', `$${price.toFixed(5)}`)}
      ${badge('P&L', `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, pnlColor)}
    </table>
    ${ctaButton('View Positions', `${config.CLIENT_URL}/dashboard`)}
  `
  await this.send(email, `${direction}: ${escapeHtml(symbol)} — Pro FundX`, layout(direction, body))
  }

  async sendOrderFilled(email: string, symbol: string, side: string, type: string, volume: number, price: number): Promise<void> {
    const body = `
      ${heading('📈 Order Filled')}
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0d1117;border:1px solid #1f2937;border-radius:8px;margin:16px 0;overflow:hidden;">
        ${badge('Symbol', escapeHtml(symbol))}
        ${badge('Type', `${escapeHtml(type.toUpperCase())} ${escapeHtml(side.toUpperCase())}`)}
        ${badge('Volume', `${volume} lots`)}
        ${badge('Fill Price', `$${price.toFixed(5)}`)}
      </table>
      ${ctaButton('View Positions', `${config.CLIENT_URL}/dashboard`)}
    `
    await this.send(email, `📈 Order Filled: ${escapeHtml(symbol)} — Pro FundX`, layout('Order Filled', body))
  }

  async sendMarginCall(email: string, accountId: string, marginLevel: number): Promise<void> {
    const body = `
      ${heading('⚠️ Margin Call Warning')}
      ${paragraph('Your account has reached the margin call level. Immediate action is required.')}
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0d1117;border:1px solid #1f2937;border-radius:8px;margin:16px 0;overflow:hidden;">
        ${badge('Account', escapeHtml(accountId))}
        ${badge('Margin Level', `${marginLevel.toFixed(2)}%`, '#ef4444')}
      </table>
      ${alert('Please add funds or close open positions immediately to avoid automatic liquidation.', 'error')}
      ${ctaButton('Manage Positions', `${config.CLIENT_URL}/dashboard`)}
    `
    await this.send(email, `⚠️ Margin Call: Account ${escapeHtml(accountId)} — Pro FundX`, layout('Margin Call', body))
  }

  async sendViolation(email: string, accountId: string, rule: string): Promise<void> {
    const body = `
      ${heading('🚫 Trading Rule Violation')}
      ${paragraph('A trading rule violation has been detected on your account.')}
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#0d1117;border:1px solid #1f2937;border-radius:8px;margin:16px 0;overflow:hidden;">
        ${badge('Account', escapeHtml(accountId))}
        ${badge('Violation', escapeHtml(rule), '#ef4444')}
      </table>
      ${alert('Continued violations may result in account suspension. Please review the trading rules.', 'error')}
      ${ctaButton('View Account', `${config.CLIENT_URL}/dashboard`)}
    `
    await this.send(email, `🚫 Trading Violation: Account ${escapeHtml(accountId)} — Pro FundX`, layout('Rule Violation', body))
  }
}
