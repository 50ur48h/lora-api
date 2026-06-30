import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Typed, ergonomic accessor over the validated environment.
 * Centralizes all config reads so the rest of the app never touches
 * `process.env` directly.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.get('APP_PORT');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  get supabaseJwtSecret(): string {
    return this.get('SUPABASE_JWT_SECRET');
  }

  get supabaseUrl(): string {
    return this.get('SUPABASE_URL');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  get sentryDsn(): string {
    return this.get('SENTRY_DSN');
  }
}
