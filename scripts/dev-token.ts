import { signToken } from '../test/helpers/auth';
import { IDS, SEED_EMAILS } from '../prisma/seed-data';

/**
 * Prints a dev JWT for a seeded user. Usage:
 *   tsx --env-file=.env scripts/dev-token.ts ownerA
 */
async function main(): Promise<void> {
  const who = (process.argv[2] ?? 'ownerA') as keyof typeof IDS;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET not set');

  const sub = IDS[who];
  if (!sub) throw new Error(`Unknown user key: ${who}`);

  const email =
    (SEED_EMAILS as Record<string, string>)[who] ?? `${who}@lora.dev`;
  const token = await signToken(sub, secret, { email });
  // eslint-disable-next-line no-console
  console.log(token);
}

void main();
