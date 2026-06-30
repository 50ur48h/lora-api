import { SignJWT } from 'jose';

/**
 * Mints a Supabase-style HS256 JWT for tests / local development.
 * Signs with the same secret the API verifies against (SUPABASE_JWT_SECRET).
 */
export async function signToken(
  sub: string,
  secret: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ aud: 'authenticated', role: 'authenticated', ...extra })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}
