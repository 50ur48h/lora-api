import { z } from 'zod';

/**
 * Environment schema. The app refuses to boot if anything required is missing
 * or malformed (fail fast). Optional integrations may be blank in local dev.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Comma-separated list of allowed CORS origins.
  CORS_ORIGINS: z.string().default(''),

  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  // Supabase
  SUPABASE_URL: z.string().default(''),
  SUPABASE_JWT_SECRET: z.string().min(16),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),

  // Redis (BullMQ)
  REDIS_URL: z.string().min(1),

  // Observability
  SENTRY_DSN: z.string().default(''),

  // Stripe (stored now, used in Phase 1)
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),

  // Email (Resend now; provider is swappable to SendGrid/Twilio later).
  // Blank key (or NODE_ENV=test) falls back to a log-only provider.
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('onboarding@resend.dev'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
