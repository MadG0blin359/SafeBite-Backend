import nodemailer, { Transporter } from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export interface SendOtpEmailParams {
  to: string;
  otp: string;
  expiresInMinutes: number;
  fullName?: string | null;
}

interface TransactionalEmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  category: string;
}

function createMailtrapTransporter(token: string) {
  return nodemailer.createTransport(
    MailtrapTransport({
      token,
      ...(env.MAILTRAP_SANDBOX_ID
        ? { sandbox: true, testInboxId: env.MAILTRAP_SANDBOX_ID }
        : {}),
    })
  );
}

type MailtrapNodemailerTransporter = ReturnType<typeof createMailtrapTransporter>;

let cachedMailtrapTransporter: MailtrapNodemailerTransporter | null = null;
let cachedMailtrapConfigKey: string | null = null;
let cachedSmtpTransporter: Transporter | null = null;
let cachedEtherealTransporter: Transporter | null = null;

function hasMailtrapConfig(): boolean {
  return Boolean(env.MAILTRAP_API_TOKEN);
}

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

function getMailtrapTransporter(): MailtrapNodemailerTransporter {
  const token = env.MAILTRAP_API_TOKEN!;
  const configKey = `${token}:${env.MAILTRAP_SANDBOX_ID ?? ""}`;

  if (!cachedMailtrapTransporter || cachedMailtrapConfigKey !== configKey) {
    cachedMailtrapTransporter = createMailtrapTransporter(token);
    cachedMailtrapConfigKey = configKey;
  }

  return cachedMailtrapTransporter;
}

function getSmtpTransporter(): Transporter {
  if (!cachedSmtpTransporter) {
    cachedSmtpTransporter = nodemailer.createTransport({
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
  return cachedSmtpTransporter;
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

async function dispatchTransactionalEmail({
  to,
  subject,
  text,
  html,
  category,
}: TransactionalEmailPayload, devOtpForDebugLog: string): Promise<{ previewUrl?: string | false }> {
  if (env.NODE_ENV === "test") {
    return {};
  }

  if (hasMailtrapConfig()) {
    const transporter = getMailtrapTransporter();
    try {
      const response = await transporter.sendMail({
        from: {
          address: env.EMAIL_FROM_ADDRESS,
          name: env.EMAIL_FROM_NAME,
        },
        to: [to],
        subject,
        text,
        html,
        category,
        ...(env.MAILTRAP_SANDBOX_ID ? { sandbox: true } : {}),
      });

      if (response && typeof response === "object" && "success" in response && !response.success) {
        const errors = Array.isArray(response.errors) ? response.errors.join(", ") : "Delivery rejected";
        throw new Error(errors);
      }

      return {};
    } catch (err) {
      logger.error(`Failed to send '${category}' email via Mailtrap:`, err);
      throw new AppError(503, "Unable to send verification email at this time. Please try again later.");
    }
  }

  if (hasSmtpConfig()) {
    const transporter = getSmtpTransporter();
    const formattedFrom = `"${env.EMAIL_FROM_NAME.replace(/"/g, "")}" <${env.EMAIL_FROM_ADDRESS}>`;
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM || formattedFrom,
        to,
        subject,
        text,
        html,
      });
      return {};
    } catch (err) {
      logger.error(`Failed to send '${category}' email via SMTP:`, err);
      throw new AppError(503, "Unable to send verification email at this time. Please try again later.");
    }
  }

  if (env.NODE_ENV === "production") {
    logger.error("Email delivery configuration missing in production environment.");
    throw new AppError(503, "Email delivery service is currently unavailable.");
  }

  const etherealTransporter = await getDevEtherealTransporter();
  if (etherealTransporter) {
    try {
      const info = await etherealTransporter.sendMail({
        from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        text,
        html,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      logger.info(`${category} preview inbox URL (dev only): ${previewUrl}`);
      return { previewUrl };
    } catch (err) {
      logger.warn("Ethereal preview delivery failed:", (err as Error).message);
    }
  }

  logger.warn("MAILTRAP_API_TOKEN and SMTP credentials are not configured in .env; logged OTP in debug mode only.");
  logger.debug(`[DEV ONLY] ${category} OTP for ${to}: ${devOtpForDebugLog}`);
  return {};
}

export const emailService = {
  /**
   * Dispatches a 6-digit account confirmation OTP code during user signup.
   */
  async sendAccountVerificationOtp({
    to,
    otp,
    expiresInMinutes,
    fullName,
  }: SendOtpEmailParams): Promise<{ previewUrl?: string | false }> {
    const greetingName = fullName?.trim() ? ` ${escapeHtml(fullName.trim())}` : "";
    const plainGreetingName = fullName?.trim() ? ` ${fullName.trim()}` : "";

    const subject = "Confirm Your SafeBite Account Email";
    const text = [
      `Hello${plainGreetingName},`,
      "",
      `Welcome to SafeBite! Use the following 6-digit verification code to confirm your email address: ${otp}`,
      "",
      `This code expires in ${expiresInMinutes} minutes and can only be used once.`,
      "If you did not create a SafeBite account, you can safely ignore this email.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #0f766e; margin-bottom: 12px;">Confirm Your SafeBite Email</h2>
        <p>Hello${greetingName},</p>
        <p>Welcome to SafeBite! Enter the 6-digit verification code below to confirm your email address and activate your account:</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${escapeHtml(otp)}</span>
        </div>
        <p>This code is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once.</p>
        <p style="font-size: 13px; color: #6b7280;">If you did not sign up for SafeBite, you can safely ignore this email.</p>
      </div>
    `.trim();

    return dispatchTransactionalEmail(
      {
        to,
        subject,
        text,
        html,
        category: "Account Email Verification",
      },
      otp
    );
  },

  /**
   * Dispatches a 6-digit password reset verification code.
   */
  async sendPasswordResetOtp({
    to,
    otp,
    expiresInMinutes,
    fullName,
  }: SendOtpEmailParams): Promise<{ previewUrl?: string | false }> {
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

    return dispatchTransactionalEmail(
      {
        to,
        subject,
        text,
        html,
        category: "Password Reset",
      },
      otp
    );
  },
};

export default emailService;
