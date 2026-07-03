import nodemailer from 'nodemailer'
import { config } from '../config/index.js'

const transporter = config.SMTP_HOST ? nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: Number(config.SMTP_PORT || 587),
  secure: false,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
}) : null

export class EmailService {
  async sendWelcome(email: string, name: string) {
    if (!transporter) return
    await transporter.sendMail({
      from: '"FundedPro" <noreply@fundedpro.com>',
      to: email,
      subject: 'Welcome to FundedPro!',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for joining FundedPro. Start your trading journey today.</p>
        <p>Your account is ready. Log in to begin your evaluation.</p>
      `,
    })
  }

  async sendVerification(email: string, token: string) {
    if (!transporter) return
    const url = `${config.CLIENT_URL}/verify-email/${token}`
    await transporter.sendMail({
      from: '"FundedPro" <noreply@fundedpro.com>',
      to: email,
      subject: 'Verify your email',
      html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
    })
  }

  async sendPasswordReset(email: string, token: string) {
    if (!transporter) return
    const url = `${config.CLIENT_URL}/reset-password/${token}`
    await transporter.sendMail({
      from: '"FundedPro" <noreply@fundedpro.com>',
      to: email,
      subject: 'Reset your password',
      html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
    })
  }

  async sendAccountCreated(email: string, account: any) {
    if (!transporter) return
    await transporter.sendMail({
      from: '"FundedPro" <noreply@fundedpro.com>',
      to: email,
      subject: 'Your trading account is ready',
      html: `
        <h1>Your Account is Ready!</h1>
        <p>Account Size: $${account.accountSize.toLocaleString()}</p>
        <p>Platform: ${account.platform}</p>
        <p>Login: ${account.login}</p>
        <p>Password: ${account.password}</p>
        <p>Server: ${account.server}</p>
      `,
    })
  }

  async sendPayoutProcessed(email: string, amount: number, status: string) {
    if (!transporter) return
    await transporter.sendMail({
      from: '"FundedPro" <noreply@fundedpro.com>',
      to: email,
      subject: `Payout ${status}`,
      html: `<p>Your payout of $${amount.toFixed(2)} has been ${status}.</p>`,
    })
  }
}
