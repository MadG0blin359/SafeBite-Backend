import { z } from "zod";

/**
 * Strict Name Validation Policy (GR-S-01):
 * 1. Allow alphabetic characters (Unicode Letter property \p{L}) across supported languages
 *    (English, Arabic, Accented Latin, Chinese/CJK, etc.).
 * 2. Allow single spaces between words (no multiple consecutive spaces, no leading/trailing).
 * 3. Allow explicitly approved name punctuation: hyphens (-) and apostrophes (').
 * 4. Reject emojis, pictographs (\p{Extended_Pictographic}, \p{Emoji_Presentation}).
 * 5. Reject digits/numbers (\p{N}, 0-9), control characters (\p{Cc}, null bytes \u0000),
 *    and invisible formatting characters (\p{Cf}, \uFEFF, \u200B-\u200D).
 * 6. Enforce min 1 and max 70 characters.
 * 7. Enforce Unicode NFC canonical composition.
 */
const strictNameRegex = /^[\p{L}]+(?:[' -][\p{L}]+)*$/u;

const emailSchema = z
  .string({ required_error: "Email address is required" })
  .trim()
  .toLowerCase()
  .email({ message: "Invalid email address" });

const passwordPolicySchema = z
  .string({ required_error: "Password is required" })
  .min(6, { message: "Password must be at least 6 characters long" })
  .max(72, { message: "Password cannot exceed 72 characters" });

export const fullNameSchema = z
  .string({ required_error: "Full name is required" })
  .refine(
    (val) => !/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Cc}\p{Cf}\uFEFF\u200B-\u200F0-9]/u.test(val),
    {
      message:
        "Name cannot contain emojis, numbers, control characters, or invisible formatting characters",
    }
  )
  .refine((val) => val.trim().length > 0, {
    message: "Name cannot be empty or whitespace only",
  })
  .refine((val) => val === val.trim(), {
    message: "Name cannot contain leading or trailing whitespace",
  })
  .refine((val) => val.length <= 70, {
    message: "Name cannot exceed 70 characters",
  })
  .refine(
    (val) => strictNameRegex.test(val.normalize("NFC")),
    {
      message:
        "Name must only contain alphabetic letters and approved punctuation (hyphens, apostrophes, single spaces between words)",
    }
  );

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordPolicySchema,
  fullName: fullNameSchema.optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(72, { message: "Password cannot exceed 72 characters" }),
});

export const updateProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyResetOtpSchema = z.object({
  email: emailSchema,
  otp: z
    .string({ required_error: "Verification code is required" })
    .trim()
    .regex(/^\d{6}$/, { message: "Verification code must be a 6-digit number" }),
});

export const resetPasswordSchema = z.object({
  resetToken: z
    .string({ required_error: "Reset token is required" })
    .trim()
    .min(1, { message: "Reset token is required" })
    .max(128, { message: "Reset token is invalid" }),
  newPassword: passwordPolicySchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
