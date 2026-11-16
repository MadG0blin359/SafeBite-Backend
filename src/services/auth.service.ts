import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { emailService } from "./email.service.js";
import {
  SignUpInput,
  VerifyEmailInput,
  SignInInput,
  UpdateProfileInput,
  VerifyResetOtpInput,
  ResetPasswordInput,
} from "../validators/auth.validator.js";

const SALT_ROUNDS = 12;
const OTP_TTL_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  emailVerified: true,
  emailVerifiedAt: true,
  healthConsent: true,
  consentDate: true,
  healthTags: true,
  createdAt: true,
} as const;

function hashSecret(secret: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(secret).digest("hex");
}

function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function issueAuthJwt(user: {
  id: string;
  email: string;
  role: string;
  healthConsent: boolean;
  tokenVersion: number;
}): string {
  // Decoupled: Stateless JWT contains strictly identity & authorization claims (SEC-001)
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      healthConsent: user.healthConsent,
      tokenVersion: user.tokenVersion,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
}

export const authService = {
  /**
   * Register a new user (or refresh a pending unverified registration) and send a 6-digit email confirmation OTP.
   */
  async signUp(input: SignUpInput) {
    const normalizedEmail = input.email.toLowerCase();
    const normalizedFullName = input.fullName ? input.fullName.trim().normalize("NFC") : undefined;

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (existing && existing.emailVerified) {
      throw new AppError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const expiresInMinutes = Math.round(OTP_TTL_MS / 60_000);

    if (existing && !existing.emailVerified) {
      const recentToken = await prisma.emailVerificationToken.findFirst({
        where: {
          userId: existing.id,
          usedAt: null,
          createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
        },
        orderBy: { createdAt: "desc" },
      });

      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          fullName: normalizedFullName ?? null,
        },
        select: USER_PUBLIC_SELECT,
      });

      if (recentToken) {
        return {
          user: updatedUser,
          requiresEmailVerification: true,
          expiresInMinutes,
        };
      }

      const otp = crypto.randomInt(100_000, 1_000_000).toString();
      const otpHash = hashSecret(otp);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      const createdToken = await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.updateMany({
          where: { userId: existing.id, usedAt: null },
          data: { usedAt: new Date(), otpHash: null },
        });

        return tx.emailVerificationToken.create({
          data: {
            userId: existing.id,
            otpHash,
            expiresAt,
          },
          select: { id: true },
        });
      });

      try {
        await emailService.sendAccountVerificationOtp({
          to: updatedUser.email,
          fullName: updatedUser.fullName,
          otp,
          expiresInMinutes,
        });
      } catch (error) {
        await prisma.emailVerificationToken
          .update({
            where: { id: createdToken.id },
            data: { usedAt: new Date(), otpHash: null },
          })
          .catch(() => undefined);
        throw error;
      }

      return {
        user: updatedUser,
        requiresEmailVerification: true,
        expiresInMinutes,
      };
    }

    const otp = crypto.randomInt(100_000, 1_000_000).toString();
    const otpHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const { user, verificationTokenId } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: normalizedFullName,
          emailVerified: false,
        },
        select: USER_PUBLIC_SELECT,
      });

      const createdToken = await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          otpHash,
          expiresAt,
        },
        select: { id: true },
      });

      return { user: createdUser, verificationTokenId: createdToken.id };
    });

    try {
      await emailService.sendAccountVerificationOtp({
        to: user.email,
        fullName: user.fullName,
        otp,
        expiresInMinutes,
      });
    } catch (error) {
      await prisma.emailVerificationToken
        .update({
          where: { id: verificationTokenId },
          data: { usedAt: new Date(), otpHash: null },
        })
        .catch(() => undefined);
      throw error;
    }

    return {
      user,
      requiresEmailVerification: true,
      expiresInMinutes,
    };
  },

  /**
   * Confirm newly registered user's email with the 6-digit OTP and issue their 90-day JWT session.
   */
  async verifyEmailOtp(input: VerifyEmailInput) {
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: {
        id: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new AppError(400, "Invalid or expired verification code.");
    }

    if (user.emailVerified) {
      throw new AppError(400, "Email address is already verified. Please sign in.");
    }

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        otpHash: { not: null },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record || !record.otpHash) {
      throw new AppError(400, "Invalid or expired verification code.");
    }

    const candidateHash = hashSecret(input.otp.trim());
    const isMatch = safeCompareHex(candidateHash, record.otpHash);

    if (!isMatch) {
      const nextAttempts = record.otpAttempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await prisma.emailVerificationToken.update({
          where: { id: record.id },
          data: { otpAttempts: nextAttempts, usedAt: now, otpHash: null },
        });
        throw new AppError(400, "Too many failed verification attempts. Please request a new code.");
      }

      await prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new AppError(400, "Invalid or expired verification code.");
    }

    const verifiedRecord = await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
        },
        data: {
          usedAt: now,
          otpHash: null,
        },
      });

      if (consumed.count === 0) {
        throw new AppError(400, "Invalid or expired verification code.");
      }

      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now, otpHash: null },
      });

      return tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
        },
        select: {
          ...USER_PUBLIC_SELECT,
          tokenVersion: true,
        },
      });
    });

    const { tokenVersion, ...verifiedUser } = verifiedRecord;
    const token = issueAuthJwt({ ...verifiedUser, tokenVersion });

    return { user: verifiedUser, token };
  },

  /**
   * Resend account confirmation OTP for unverified accounts without leaking account existence.
   */
  async resendVerificationOtp(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, fullName: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      return;
    }

    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentToken) {
      return;
    }

    const otp = crypto.randomInt(100_000, 1_000_000).toString();
    const otpHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const createdRecord = await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date(), otpHash: null },
      });

      return tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
        },
        select: { id: true },
      });
    });

    try {
      await emailService.sendAccountVerificationOtp({
        to: user.email,
        fullName: user.fullName,
        otp,
        expiresInMinutes: Math.round(OTP_TTL_MS / 60_000),
      });
    } catch (error) {
      await prisma.emailVerificationToken
        .update({
          where: { id: createdRecord.id },
          data: { usedAt: new Date(), otpHash: null },
        })
        .catch(() => undefined);
      throw error;
    }
  },

  /**
   * Log in user using email and password after confirming verified email ownership.
   */
  async signIn(input: SignInInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError(401, "Invalid email or password");
    }

    if (!user.emailVerified) {
      throw new AppError(
        403,
        "Email address not verified. Please confirm your account using the 6-digit verification code sent to your email."
      );
    }

    const token = issueAuthJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      healthConsent: user.healthConsent,
      tokenVersion: user.tokenVersion,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      healthConsent: user.healthConsent,
      consentDate: user.consentDate,
      healthTags: user.healthTags,
      createdAt: user.createdAt,
    };

    return { user: userProfile, token };
  },

  /**
   * Fetch current authenticated user's profile.
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new AppError(404, "User profile not found");
    }

    return user;
  },

  /**
   * Update profile information with strict validation (SEC-001).
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName ? input.fullName.trim().normalize("NFC") : undefined,
      },
      select: {
        ...USER_PUBLIC_SELECT,
        updatedAt: true,
      },
    });

    return user;
  },

  /**
   * Step 1: Generate and email a single-use 6-digit password reset OTP.
   * Always returns without revealing whether the account exists.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      return;
    }

    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentToken) {
      return;
    }

    const otp = crypto.randomInt(100_000, 1_000_000).toString();
    const otpHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const createdRecord = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date(), otpHash: null, resetTokenHash: null },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
        },
        select: { id: true },
      });
    });

    try {
      await emailService.sendPasswordResetOtp({
        to: user.email,
        fullName: user.fullName,
        otp,
        expiresInMinutes: Math.round(OTP_TTL_MS / 60_000),
      });
    } catch (error) {
      await prisma.passwordResetToken
        .update({
          where: { id: createdRecord.id },
          data: { usedAt: new Date(), otpHash: null, resetTokenHash: null },
        })
        .catch(() => undefined);
      throw error;
    }
  },

  /**
   * Step 2: Verify the 6-digit OTP and exchange it for a short-lived single-use reset token.
   */
  async verifyResetOtp(input: VerifyResetOtpInput): Promise<{ resetToken: string; expiresInMinutes: number }> {
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      throw new AppError(400, "Invalid or expired verification code.");
    }

    const record = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        otpVerifiedAt: null,
        otpHash: { not: null },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record || !record.otpHash) {
      throw new AppError(400, "Invalid or expired verification code.");
    }

    const candidateHash = hashSecret(input.otp.trim());
    const isMatch = safeCompareHex(candidateHash, record.otpHash);

    if (!isMatch) {
      const nextAttempts = record.otpAttempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await prisma.passwordResetToken.update({
          where: { id: record.id },
          data: { otpAttempts: nextAttempts, usedAt: now, otpHash: null },
        });
        throw new AppError(400, "Too many failed verification attempts. Please request a new code.");
      }

      await prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new AppError(400, "Invalid or expired verification code.");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashSecret(resetToken);
    const resetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    const updated = await prisma.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        otpVerifiedAt: null,
      },
      data: {
        otpHash: null,
        otpVerifiedAt: now,
        resetTokenHash,
        expiresAt: resetExpiresAt,
      },
    });

    if (updated.count === 0) {
      throw new AppError(400, "Invalid or expired verification code.");
    }

    return {
      resetToken,
      expiresInMinutes: Math.round(RESET_TOKEN_TTL_MS / 60_000),
    };
  },

  /**
   * Step 3: Update password using the verified single-use reset token and revoke prior JWT sessions.
   */
  async completePasswordReset(input: ResetPasswordInput): Promise<void> {
    const now = new Date();
    const resetTokenHash = hashSecret(input.resetToken.trim());

    const record = await prisma.passwordResetToken.findUnique({
      where: { resetTokenHash },
    });

    if (!record || record.usedAt || !record.otpVerifiedAt || record.expiresAt <= now) {
      throw new AppError(400, "Reset session is invalid or has expired. Please start over.");
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
        },
        data: {
          usedAt: now,
          resetTokenHash: null,
        },
      });

      if (consumed.count === 0) {
        throw new AppError(400, "Reset session has already been used.");
      }

      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now, otpHash: null, resetTokenHash: null },
      });

      const currentUser = await tx.user.findUnique({
        where: { id: record.userId },
        select: { emailVerifiedAt: true },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: newPasswordHash,
          tokenVersion: { increment: 1 },
          emailVerified: true,
          emailVerifiedAt: currentUser?.emailVerifiedAt ?? now,
        },
      });
    });
  },

  /**
   * Revoke active JWTs on logout by incrementing user's token version.
   */
  async signOut(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  },
};

export default authService;
