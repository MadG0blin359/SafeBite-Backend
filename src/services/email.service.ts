import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export interface SendPasswordResetOtpParams {
  to: string;
  otp: string;
  expiresInMinutes: number;
  fullName?: string | null;
}

let cachedTransporter: Transporter | null = null;
let cachedEtherealTransporter: Transporter | null = null;

function hasSmtpConfig(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSmtpTransporter(): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return cachedTransporter;
}

async function getDevEtherealTransporter(): Promise<Transporter | null> {
  if (cachedEtherealTransporter) {
    return cachedEtherealTransporter;
  }
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedEtherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedEtherealTransporter;
  } catch (err) {
    logger.warn("Unable to initialize Ethereal preview account:", (err as Error).message);
    return null;
  }
}

export const emailService = {
  /**
   * Dispatches a 6-digit password reset verification code over configured SMTP.
   * Exposed as an interchangeable transporter helper for testing and dev previews.
   */
  async sendPasswordResetOtp({
    to,
    otp,
    expiresInMinutes,
    fullName,
  }: SendPasswordResetOtpParams): Promise<{ previewUrl?: string | false }> {
    const greetingName = fullName?.trim() ? ` ${escapeHtml(fullName.trim())}` : "";
    const plainGreetingName = fullName?.trim() ? ` ${fullName.trim()}` : "";

    const subject = "SafeBite Password Reset Verification Code";
    const text = [
      `Hello${plainGreetingName},`,
      "",
      `Use the following 6-digit code to reset your SafeBite password: ${otp}`,
      "",
      `This code expires in ${expiresInMinutes} minutes and can only be used once.`,
      "If you did not request a password reset, you can safely ignore this email.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #0f766e; margin-bottom: 12px;">SafeBite Password Reset</h2>
        <p>Hello${greetingName},</p>
        <p>Use the 6-digit verification code below to continue resetting your SafeBite account password:</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${escapeHtml(otp)}</span>
        </div>
        <p>This code is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once.</p>
        <p style="font-size: 13px; color: #6b7280;">If you did not request this password reset, you can safely ignore this email.</p>
      </div>
    `.trim();

    if (hasSmtpConfig()) {
      const transporter = getSmtpTransporter();
      try {
        await transporter.sendMail({
          from: env.SMTP_FROM,
          to,
          subject,
          text,
          html,
        });
      } catch (err) {
        logger.error("Failed to send password reset email via SMTP:", err);
        throw new AppError(503, "Unable to send verification email at this time. Please try again later.");
      }
      return {};
    }

    if (env.NODE_ENV === "production") {
      logger.error("SMTP configuration missing in production environment.");
      throw new AppError(503, "Email delivery service is currently unavailable.");
    }

    if (env.NODE_ENV === "test") {
      return {};
    }

    // Development fallback: use Ethereal preview inbox or debug log if offline
    const etherealTransporter = await getDevEtherealTransporter();
    if (etherealTransporter) {
      try {
        const info = await etherealTransporter.sendMail({
          from: env.SMTP_FROM,
          to,
          subject,
          text,
          html,
        });
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`Password reset preview inbox URL (dev only): ${previewUrl}`);
        return { previewUrl };
      } catch (err) {
        logger.warn("Ethereal preview delivery failed:", (err as Error).message);
      }
    }

    logger.warn("SMTP credentials are not configured in .env; logged OTP in debug mode only.");
    logger.debug(`[DEV ONLY] Password reset OTP for ${to}: ${otp}`);
    return {};
  },
};

export default emailService;
