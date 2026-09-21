let Resend = null;
try {
  Resend = require('resend').Resend;
} catch (err) {
  // Resend module optional
}
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {}

  _getClient() {
    const apiKey = process.env.RESEND_API_KEY || config.resend?.apiKey;
    if (Resend && apiKey && apiKey.startsWith('re_')) {
      return new Resend(apiKey);
    }
    return null;
  }

  /**
   * Generic send email method using Resend API
   */
  async sendEmail({ to, subject, html, text }) {
    const from = process.env.RESEND_FROM_EMAIL || config.resend?.fromEmail || 'BizReels <onboarding@resend.dev>';
    const apiKey = process.env.RESEND_API_KEY || config.resend?.apiKey;
    const client = this._getClient();

    if (!apiKey || !apiKey.startsWith('re_') || !client) {
      logger.warn(
        `[RESEND CONFIG MISSING] ⚠️ RESEND_API_KEY is not set in backend/.env! Please paste your key (starting with re_...) in backend/.env. Live email NOT dispatched. 📧 Mock To: ${to} | Subject: "${subject}"`
      );
      return { success: false, provider: 'mock_unconfigured', message: 'RESEND_API_KEY missing in backend/.env' };
    }

    try {
      const response = await client.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || '',
      });

      if (response.error) {
        logger.error(`[Resend Error] Failed to send email to ${to}: ${response.error.message}`, {
          service: 'email',
          error: response.error,
        });
        return { success: false, error: response.error };
      }

      logger.info(`[Resend Success] Email sent to ${to} (ID: ${response.data?.id})`, { service: 'email' });
      return { success: true, provider: 'resend', id: response.data?.id };
    } catch (err) {
      logger.error(`[Resend Exception] Error sending email to ${to}: ${err.message}`, {
        service: 'email',
        stack: err.stack,
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper to generate a responsive, client-safe HTML email in BizReels'
   * Warm Editorial Bento-Brutalism brand aesthetic.
   */
  _buildWarmEditorialEmail({
    badge = 'SECURE VERIFICATION',
    heading,
    subheading = 'AI-Powered Local Business Marketplace',
    title,
    description,
    otp,
    expiresInMinutes = 5,
    securityNotice = 'Never share this code with anyone. BizReels representatives will never contact you asking for your verification code.',
    year = new Date().getFullYear(),
  }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'BizReels Verification'}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4efe6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4efe6;
      padding: 40px 16px;
    }
    .email-container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e3dccb;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(36, 27, 21, 0.08);
    }
    .header-banner {
      background: #241b15;
      background-image: linear-gradient(135deg, #241b15 0%, #3a2c20 100%);
      padding: 32px 28px 26px 28px;
      text-align: center;
    }
    .badge-pill {
      display: inline-block;
      background: rgba(217, 154, 61, 0.18);
      border: 1px solid rgba(217, 154, 61, 0.4);
      color: #d99a3d;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-title span {
      color: #d99a3d;
    }
    .brand-subtitle {
      color: #c5bba8;
      font-size: 12px;
      font-weight: 500;
      margin: 6px 0 0 0;
      letter-spacing: 0.3px;
    }
    .content-body {
      padding: 36px 32px 32px 32px;
      background-color: #ffffff;
    }
    .purpose-title {
      font-size: 20px;
      font-weight: 800;
      color: #1a1a1a;
      margin: 0 0 10px 0;
      line-height: 1.3;
    }
    .desc-text {
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
      margin: 0 0 24px 0;
    }
    .otp-card {
      background-color: #fbf9f5;
      border: 2px solid #e3dccb;
      border-radius: 18px;
      padding: 24px 16px;
      text-align: center;
      margin: 0 0 24px 0;
    }
    .otp-micro-label {
      font-size: 11px;
      font-weight: 800;
      color: #9e6715;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Display', monospace;
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #1a1a1a;
      display: inline-block;
      padding: 6px 0;
      margin-left: 10px;
    }
    .otp-expiry {
      font-size: 12px;
      font-weight: 600;
      color: #71717a;
      margin-top: 8px;
    }
    .security-box {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #d99a3d;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 8px;
    }
    .security-text {
      font-size: 12px;
      line-height: 1.55;
      color: #92400e;
      margin: 0;
    }
    .email-footer {
      background-color: #f8f4ec;
      border-top: 1px solid #e3dccb;
      padding: 22px 28px;
      text-align: center;
    }
    .footer-text {
      font-size: 11px;
      color: #8c8273;
      line-height: 1.6;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <!-- Header Banner -->
      <tr>
        <td class="header-banner">
          <div class="badge-pill">${badge}</div>
          <h1 class="brand-title">BIZ<span>REELS</span></h1>
          <p class="brand-subtitle">${subheading}</p>
        </td>
      </tr>

      <!-- Content Body -->
      <tr>
        <td class="content-body">
          <h2 class="purpose-title">${title}</h2>
          <p class="desc-text">${description}</p>

          <!-- OTP Card Hero -->
          <div class="otp-card">
            <div class="otp-micro-label">One-Time Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">⏱️ Valid for <strong>${expiresInMinutes} minutes</strong></div>
          </div>

          <!-- Security Alert Notice -->
          <div class="security-box">
            <p class="security-text">
              <strong>🔒 Security Reminder:</strong> ${securityNotice}
            </p>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="email-footer">
          <p class="footer-text">
            © ${year} <strong>BizReels Inc.</strong> All rights reserved.<br>
            This is an automated verification email. Please do not reply directly to this message.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  }

  /**
   * Send Password Reset OTP Email
   */
  async sendPasswordResetOtp({ to, otp, expiresInMinutes = 5 }) {
    const subject = `Your BizReels Password Reset Code: ${otp}`;

    const html = this._buildWarmEditorialEmail({
      badge: 'ACCOUNT RECOVERY',
      title: 'Password Reset Request',
      description: 'We received a request to reset the password for your BizReels account. Use the one-time verification code below to proceed:',
      otp,
      expiresInMinutes,
      securityNotice: 'Never share this code with anyone. If you did not make this request, you can safely ignore this email.',
    });

    const text = `BizReels Password Reset Request\n\nYour one-time verification OTP code is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you did not request this, please ignore this email.\n\n- The BizReels Team`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * General Email OTP verification (Vendor, Creator, Customer)
   */
  async sendOtpEmail({ to, otp, purpose = 'Verification', expiresInMinutes = 5 }) {
    const formattedPurpose = purpose.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const subject = `Your BizReels ${formattedPurpose} Code: ${otp}`;

    const html = this._buildWarmEditorialEmail({
      badge: 'OFFICIAL VERIFICATION',
      title: `BizReels ${formattedPurpose}`,
      description: `Please use the 6-digit verification code below to complete your ${formattedPurpose.toLowerCase()} on BizReels:`,
      otp,
      expiresInMinutes,
      securityNotice: 'Never share this code with anyone. BizReels representatives will never contact you asking for your verification code.',
    });

    const text = `Your BizReels ${formattedPurpose} code is: ${otp}. Valid for ${expiresInMinutes} minutes.\n\nPlease do not share this code with anyone.`;
    return this.sendEmail({ to, subject, html, text });
  }
}

module.exports = new EmailService();
