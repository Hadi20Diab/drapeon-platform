import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().min(1).default("api"),
  WEB_ORIGIN: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  GEMINI_API_KEY: z.string().min(8),
  GEMINI_MODEL: z.string().min(1).default("gemini-3-flash-preview"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CURRENCY: z.string().length(3).default("usd"),
  STRIPE_CONNECT_COUNTRY: z.string().length(2).default("US"),
  STRIPE_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(750),
  STRIPE_SUCCESS_URL: z.string().min(1).optional(),
  STRIPE_CANCEL_URL: z.string().url().optional(),
  STRIPE_CONNECT_REFRESH_URL: z.string().url().optional(),
  STRIPE_CONNECT_RETURN_URL: z.string().url().optional()
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
