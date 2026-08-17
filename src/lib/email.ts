import { Resend } from 'resend';
import config from '../config/index.js';


if (!config.email.resend_api_key) {
  console.warn('RESEND_API_KEY is not set - password reset emails will fail to send.');
}

const resend = new Resend(config.email.resend_api_key);

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> => {
  await resend.emails.send({
    from: config.email.from,
    to,
    subject: 'Reset your FixItNow password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your FixItNow password. This link expires in 15 minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#111827;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
      </div>
    `,
  });
};

export default resend;