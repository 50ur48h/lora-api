import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
} from 'jose';
import { verifyJwt } from './jwt';

const ISSUER = 'https://project.supabase.co/auth/v1';
const HS256_SECRET = 'a-local-dev-secret-at-least-16-chars';

describe('verifyJwt', () => {
  it('verifies an ES256 token against a JWKS (hosted Supabase)', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const publicJwk: JWK = {
      ...(await exportJWK(publicKey)),
      kid: 'k1',
      alg: 'ES256',
    };
    const jwks = createLocalJWKSet({ keys: [publicJwk] });

    const token = await new SignJWT({
      role: 'authenticated',
      email: 'owner@spa.dev',
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject('user-1')
      .setAudience('authenticated')
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const payload = await verifyJwt(token, { jwks }, { issuer: ISSUER });
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('owner@spa.dev');
  });

  it('verifies an HS256 token against the shared secret (local dev)', async () => {
    const secret = new TextEncoder().encode(HS256_SECRET);
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-2')
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const payload = await verifyJwt(token, { secret });
    expect(payload.sub).toBe('user-2');
  });

  it('rejects a token with the wrong audience', async () => {
    const secret = new TextEncoder().encode(HS256_SECRET);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-3')
      .setAudience('anon')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    await expect(verifyJwt(token, { secret })).rejects.toThrow();
  });

  it('rejects an ES256 token when the issuer does not match', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const publicJwk: JWK = {
      ...(await exportJWK(publicKey)),
      kid: 'k1',
      alg: 'ES256',
    };
    const jwks = createLocalJWKSet({ keys: [publicJwk] });

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject('user-4')
      .setAudience('authenticated')
      .setIssuer('https://evil.example/auth/v1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    await expect(
      verifyJwt(token, { jwks }, { issuer: ISSUER }),
    ).rejects.toThrow();
  });

  it('rejects an HS256 token when only JWKS is configured', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const publicJwk: JWK = {
      ...(await exportJWK(publicKey)),
      kid: 'k1',
      alg: 'ES256',
    };
    const jwks = createLocalJWKSet({ keys: [publicJwk] });
    void privateKey;

    const secret = new TextEncoder().encode(HS256_SECRET);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-5')
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    await expect(verifyJwt(token, { jwks })).rejects.toThrow(
      'HS256 verification is not configured',
    );
  });
});
