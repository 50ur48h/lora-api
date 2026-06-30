import { jwtVerify } from 'jose';

export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  [claim: string]: unknown;
}

/**
 * Verifies a Supabase-issued JWT (HS256, signed with the project JWT secret).
 * Env-driven so a hosted Supabase project drops in without code changes.
 *
 * Throws if the token is missing, expired, or has an invalid signature.
 */
export async function verifySupabaseJwt(
  token: string,
  secret: string,
): Promise<SupabaseJwtPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
  });

  if (!payload.sub) {
    throw new Error('JWT is missing the "sub" claim');
  }

  return payload as SupabaseJwtPayload;
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
