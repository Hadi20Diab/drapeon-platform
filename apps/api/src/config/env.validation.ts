import { z } from "zod";

function isValidOriginList(value: string): boolean {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .every((origin) => {
      if (origin === "*") {
        return true;
      }

      try {
        const parsed = new URL(origin);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().min(1).default("api"),
  WEB_ORIGIN: z
    .string()
    .min(1)
    .refine(isValidOriginList, "WEB_ORIGIN must be a valid absolute URL or a comma-separated list of absolute URLs.")
    .optional(),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  GEMINI_API_KEY: z.string().min(8),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().optional(),
  PINECONE_NAMESPACE: z.string().min(1).default("company-knowledge"),
  PINECONE_TEXT_FIELD: z.string().min(1).default("text"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CURRENCY: z.string().length(3).default("usd"),
  STRIPE_CONNECT_COUNTRY: z.string().length(2).default("US"),
  STRIPE_SUBSCRIPTION_SUCCESS_URL: z.string().optional(),
  STRIPE_SUBSCRIPTION_CANCEL_URL: z.string().optional(),
  STRIPE_BILLING_PORTAL_RETURN_URL: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  CONTACT_TO_EMAIL: z.string().email().optional(),
  CONTACT_FROM_EMAIL: z.string().email().optional(),
  CONTACT_FROM_NAME: z.string().optional(),
  MAILIDATOR_API_KEY: z.string().optional(),
  MAILIDATOR_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  EMAIL_VERIFICATION_TTL: z.coerce.number().int().positive().default(86_400),
  PASSWORD_RESET_TTL: z.coerce.number().int().positive().default(3_600)
});

export type EnvVariables = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  return result.data;
}
