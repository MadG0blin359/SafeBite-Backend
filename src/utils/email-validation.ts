import dns from "dns/promises";
import { z } from "zod";

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const DISALLOWED_CHARS_REGEX =
  /[\u0000-\u001F\u007F\p{Cc}\p{Cf}\uFEFF\u200B-\u200F\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_REGEX = /^[a-z]{2,63}$/;
const DNS_TIMEOUT_MS = 2_000;

export const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "10minutemail.com",
  "10minutemail.net",
  "dispostable.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export interface EmailSyntaxInspection {
  validSyntax: boolean;
  normalizedEmail: string;
  localPart: string;
  domain: string;
  noInvalidChars: boolean;
  suggestion?: string;
  isDisposable: boolean;
  reason?: string;
}

export interface EmailDeliverabilityResult {
  valid: boolean;
  normalizedEmail: string;
  checks: {
    syntax: boolean;
    noInvalidChars: boolean;
    notDisposable: boolean;
    noKnownTypo: boolean;
    domainResolvable: boolean | null;
  };
  suggestion?: string;
  message?: string;
}

const basicEmailValidator = z.string().email();

export function inspectEmailInput(rawEmail: string): EmailSyntaxInspection {
  const noInvalidChars = !DISALLOWED_CHARS_REGEX.test(rawEmail);
  const normalizedEmail = rawEmail.trim().toLowerCase();

  if (!noInvalidChars) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart: "",
      domain: "",
      noInvalidChars: false,
      isDisposable: false,
      reason: "Email address contains unsupported control or invisible characters",
    };
  }

  if (!normalizedEmail) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart: "",
      domain: "",
      noInvalidChars: true,
      isDisposable: false,
      reason: "Email address is required",
    };
  }

  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart: "",
      domain: "",
      noInvalidChars: true,
      isDisposable: false,
      reason: `Email address cannot exceed ${MAX_EMAIL_LENGTH} characters`,
    };
  }

  if (/\s/.test(normalizedEmail)) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart: "",
      domain: "",
      noInvalidChars: true,
      isDisposable: false,
      reason: "Email address cannot contain internal spaces",
    };
  }

  const atParts = normalizedEmail.split("@");
  if (atParts.length !== 2) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart: "",
      domain: "",
      noInvalidChars: true,
      isDisposable: false,
      reason: "Invalid email address format",
    };
  }

  const [localPart, domain] = atParts;

  if (
    !localPart ||
    localPart.length > MAX_LOCAL_PART_LENGTH ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart,
      domain,
      noInvalidChars: true,
      isDisposable: false,
      reason: "Invalid email username format before '@'",
    };
  }

  if (!domain || domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart,
      domain,
      noInvalidChars: true,
      isDisposable: false,
      reason: "Invalid email domain format after '@'",
    };
  }

  const domainLabels = domain.split(".");
  const tld = domainLabels[domainLabels.length - 1] ?? "";

  if (
    domainLabels.length < 2 ||
    !domainLabels.every((label) => DOMAIN_LABEL_REGEX.test(label)) ||
    !TLD_REGEX.test(tld)
  ) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart,
      domain,
      noInvalidChars: true,
      isDisposable: false,
      reason: "Email domain must include a valid domain name and top-level domain",
    };
  }

  if (!basicEmailValidator.safeParse(normalizedEmail).success) {
    return {
      validSyntax: false,
      normalizedEmail,
      localPart,
      domain,
      noInvalidChars: true,
      isDisposable: false,
      reason: "Invalid email address",
    };
  }

  const correctedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domain];
  const suggestion = correctedDomain ? `${localPart}@${correctedDomain}` : undefined;
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);

  return {
    validSyntax: true,
    normalizedEmail,
    localPart,
    domain,
    noInvalidChars: true,
    suggestion,
    isDisposable,
  };
}

async function checkDomainMxWithTimeout(domain: string): Promise<boolean | null> {
  let timer: NodeJS.Timeout | undefined;
  const lookupPromise = (async (): Promise<boolean | null> => {
    try {
      const mxRecords = await dns.resolveMx(domain);
      const activeMx = mxRecords.filter((rec) => rec.exchange && rec.exchange.trim() !== "");
      if (activeMx.length > 0) {
        return true;
      }
      // RFC 7505 explicit Null MX (0 .) means domain accepts no mail
      if (mxRecords.length > 0) {
        return false;
      }
      return false;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENODATA") {
        // Fallback to A record when domain has no explicit MX (RFC 5321 Section 5.1)
        try {
          const ipv4 = await dns.resolve4(domain);
          return ipv4.length > 0;
        } catch (fallbackErr) {
          const fallbackCode = (fallbackErr as NodeJS.ErrnoException)?.code;
          if (fallbackCode === "ENOTFOUND" || fallbackCode === "ENODATA") {
            return false;
          }
          return null;
        }
      }
      if (code === "ENOTFOUND") {
        return false;
      }
      return null;
    }
  })();

  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), DNS_TIMEOUT_MS);
    timer.unref();
  });

  try {
    return await Promise.race([lookupPromise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function verifyEmailInputDeliverability(
  rawEmail: string
): Promise<EmailDeliverabilityResult> {
  const inspection = inspectEmailInput(rawEmail);

  if (!inspection.validSyntax) {
    return {
      valid: false,
      normalizedEmail: inspection.normalizedEmail,
      checks: {
        syntax: false,
        noInvalidChars: inspection.noInvalidChars,
        notDisposable: true,
        noKnownTypo: true,
        domainResolvable: null,
      },
      message: inspection.reason || "Invalid email address",
    };
  }

  if (inspection.suggestion) {
    return {
      valid: false,
      normalizedEmail: inspection.normalizedEmail,
      checks: {
        syntax: true,
        noInvalidChars: true,
        notDisposable: !inspection.isDisposable,
        noKnownTypo: false,
        domainResolvable: null,
      },
      suggestion: inspection.suggestion,
      message: `Domain '${inspection.domain}' looks like a typo. Did you mean '${inspection.suggestion}'?`,
    };
  }

  if (inspection.isDisposable) {
    return {
      valid: false,
      normalizedEmail: inspection.normalizedEmail,
      checks: {
        syntax: true,
        noInvalidChars: true,
        notDisposable: false,
        noKnownTypo: true,
        domainResolvable: null,
      },
      message: "Disposable email addresses cannot be used for SafeBite accounts.",
    };
  }

  const domainResolvable = await checkDomainMxWithTimeout(inspection.domain);
  const valid = domainResolvable !== false;

  return {
    valid,
    normalizedEmail: inspection.normalizedEmail,
    checks: {
      syntax: true,
      noInvalidChars: true,
      notDisposable: true,
      noKnownTypo: true,
      domainResolvable,
    },
    ...(domainResolvable === false
      ? {
          message: `The email domain '${inspection.domain}' cannot receive email.`,
        }
      : {}),
  };
}
