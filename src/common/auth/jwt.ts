import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTPayload,
} from 'jose';

export interface SupabaseJwtPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
}

/** Every Supabase-issued access token carries this audience. */
const AUDIENCE = 'authenticated';

export interface VerificationKeys {
  /** HMAC secret for HS256 tokens (local dev / tests). */
  secret?: Uint8Array;
  /** JWKS resolver for asymmetric tokens (ES256/RS256 — hosted Supabase). */
  jwks?: JWTVerifyGetKey;
}

/**
 * Verifies a Supabase access token. HS256 tokens are checked against the shared
 * secret (local dev); asymmetric tokens (ES256/RS256) are checked against the
 * project JWKS. Throws if the token is missing/expired/invalid or lacks `sub`.
 */
export async function verifyJwt(
  token: string,
  keys: VerificationKeys,
  options: { issuer?: string } = {},
): Promise<SupabaseJwtPayload> {
  const { alg } = decodeProtectedHeader(token);

  let payload: JWTPayload;
  if (alg === 'HS256') {
    if (!keys.secret) {
      throw new Error('HS256 verification is not configured');
    }
    ({ payload } = await jwtVerify(token, keys.secret, {
      algorithms: ['HS256'],
      audience: AUDIENCE,
    }));
  } else {
    if (!keys.jwks) {
      throw new Error('Asymmetric (JWKS) verification is not configured');
    }
    ({ payload } = await jwtVerify(token, keys.jwks, {
      algorithms: ['ES256', 'RS256'],
      audience: AUDIENCE,
      ...(options.issuer ? { issuer: options.issuer } : {}),
    }));
  }

  if (!payload.sub) {
    throw new Error('JWT is missing the "sub" claim');
  }
  return payload as SupabaseJwtPayload;
}

/** Builds a cached remote JWKS resolver for a Supabase project URL. */
export function supabaseJwks(supabaseUrl: string): JWTVerifyGetKey {
  return createRemoteJWKSet(
    new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
  );
}

/** The issuer Supabase stamps on access tokens for a project URL. */
export function supabaseIssuer(supabaseUrl: string): string {
  return `${supabaseUrl}/auth/v1`;
}

/** Extracts a bearer token from the Authorization header, or null. */
export function extractBearerToken(
  authorization: string | undefined,
): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}
