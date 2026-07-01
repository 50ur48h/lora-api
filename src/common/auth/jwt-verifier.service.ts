import { Injectable } from '@nestjs/common';
import type { JWTVerifyGetKey } from 'jose';
import { AppConfigService } from '../../config/app-config.service';
import {
  supabaseIssuer,
  supabaseJwks,
  verifyJwt,
  type SupabaseJwtPayload,
} from './jwt';

/**
 * Verifies incoming access tokens. Hosted Supabase signs with ES256 and exposes
 * a JWKS (asymmetric, no shared secret needed); local dev/tests use an HS256
 * shared secret. Both are supported so the same guard works everywhere.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly secret?: Uint8Array;
  private readonly jwks?: JWTVerifyGetKey;
  private readonly issuer?: string;

  constructor(config: AppConfigService) {
    const secret = config.supabaseJwtSecret;
    if (secret) {
      this.secret = new TextEncoder().encode(secret);
    }

    const url = config.supabaseUrl;
    if (url) {
      this.jwks = supabaseJwks(url);
      this.issuer = supabaseIssuer(url);
    }
  }

  verify(token: string): Promise<SupabaseJwtPayload> {
    return verifyJwt(
      token,
      { secret: this.secret, jwks: this.jwks },
      { issuer: this.issuer },
    );
  }
}
