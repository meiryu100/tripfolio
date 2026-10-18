import { z } from "zod";

/** Shared between the API (authoritative) and forms (instant feedback). */

// Don't let zod probe for `new Function` (its faster compiled parsers): our Content-Security-Policy
// doesn't allow eval, so the probe would be blocked and reported on every page that validates.
z.config({ jitless: true });

const trimmed = (max: number) => z.string().trim().max(max);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,20}$/, "3–20 characters: lowercase letters, numbers, dots or underscores.");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "That password is too long.");

export const GENDERS = ["male", "female"] as const;
/** Required: there is no default, the user must pick one. */
export const genderSchema = z.enum(GENDERS, { message: "Please choose male or female." });

const nameSchema = (label: string) => z.string().trim().min(1, `${label} is required.`).max(50);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    /** Username of the person whose invite link this sign-up came from. */
    ref: z.string().trim().toLowerCase().max(40).optional(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

/** The "About you" onboarding step: the details we no longer ask for at sign-up. */
export const aboutYouSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  username: usernameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

/** The code in an emailed link. A cut-off link gets the same friendly message as a wrong one. */
const linkTokenSchema = (message: string) => z.string().min(20, message).max(200, message);

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resendVerificationSchema = z.object({ email: emailSchema });
export const verifyEmailSchema = z.object({ token: linkTokenSchema("This link is invalid or has expired.") });

export const resetPasswordSchema = z.object({
  token: linkTokenSchema("This reset link is invalid or has expired."),
  password: passwordSchema,
});

const websiteSchema = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Enter a full URL starting with https://")
  .transform((v) => v);

export const profileSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  gender: genderSchema,
  username: usernameSchema,
  bio: trimmed(160),
  location: trimmed(80),
  website: websiteSchema,
});

export const changeEmailSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

export const changePasswordSchema = z.object({
  current: z.string().default(""),
  next: passwordSchema,
});

export const deleteAccountSchema = z.object({ password: z.string().default(""), confirm: z.string() });

export const settingsSchema = z
  .object({
    isPrivate: z.boolean(),
    showVisited: z.boolean(),
    showWishlist: z.boolean(),
    showTrips: z.boolean(),
    showPhotos: z.boolean(),
    notifyFollows: z.boolean(),
    notifyTrips: z.boolean(),
    notifyEmail: z.boolean(),
    theme: z.enum(["light", "dark", "system"]),
  })
  .partial();

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Unknown country.");

export const countryStatusSchema = z.object({
  countryCode: countryCodeSchema,
  status: z.enum(["VISITED", "WANT_TO_VISIT"]),
});

export const regionStatusSchema = z.object({
  regionCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}-[A-Z0-9]{1,3}$/, "Unknown region."),
  status: z.enum(["VISITED", "WANT_TO_VISIT"]),
});

export const bulkStatusSchema = z.object({
  status: z.enum(["VISITED", "WANT_TO_VISIT"]),
  countryCodes: z.array(countryCodeSchema).max(260),
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .nullable()
  .optional()
  .transform((v) => v || null);

export const tripSchema = z
  .object({
    countryCode: countryCodeSchema,
    title: trimmed(80).default(""),
    description: trimmed(4000).default(""),
    cities: z.array(trimmed(60)).max(20).default([]),
    startDate: dateSchema,
    endDate: dateSchema,
    /** Uploaded photo IDs in display order; the first is the cover. */
    photoIds: z.array(z.string().uuid()).max(30).default([]),
  })
  .refine((t) => !t.startDate || !t.endDate || t.endDate >= t.startDate, {
    message: "End date can't be before the start date.",
    path: ["endDate"],
  });

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
});

export const MESSAGE_MAX = 2000;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message.").max(MESSAGE_MAX, `Messages can be up to ${MESSAGE_MAX} characters.`),
});

export const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: trimmed(1000).default(""),
  messageId: z.string().uuid().optional(),
});

export const chatQuerySchema = z.object({
  /** Load messages older than this message (for "load earlier"). */
  before: z.string().uuid().optional(),
});

/** Cookie banner choice. `landing` and `referrer` are the first page the visitor saw, kept in memory by the browser. */
export const consentSchema = z.object({
  choice: z.enum(["all", "essential"]),
  landing: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
});
