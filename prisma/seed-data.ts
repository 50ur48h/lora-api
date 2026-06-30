/**
 * Stable identifiers shared by the seed and the isolation tests. Two tenants is
 * deliberate — you cannot test isolation with one.
 */
export const IDS = {
  admin: '00000000-0000-4000-8000-000000000000',

  tenantA: '11111111-1111-4111-8111-111111111111',
  storeA: '1a1a1a1a-1111-4111-8111-aaaaaaaaaaaa',
  ownerA: 'a0000000-0000-4000-8000-00000000000a',
  managerA: 'a0000000-0000-4000-8000-00000000001a',
  staffA1: 'a0000000-0000-4000-8000-0000000000a1',
  staffA2: 'a0000000-0000-4000-8000-0000000000a2',
  customerA1: 'a0000000-0000-4000-8000-0000000000c1',

  tenantB: '22222222-2222-4222-8222-222222222222',
  storeB: '2b2b2b2b-2222-4222-8222-bbbbbbbbbbbb',
  ownerB: 'b0000000-0000-4000-8000-00000000000b',
  staffB1: 'b0000000-0000-4000-8000-0000000000b1',
  staffB2: 'b0000000-0000-4000-8000-0000000000b2',
  customerB1: 'b0000000-0000-4000-8000-0000000000c1',
} as const;

export const SEED_EMAILS = {
  admin: 'admin@lora.dev',
  ownerA: 'owner@glow.dev',
  managerA: 'manager@glow.dev',
  ownerB: 'owner@serene.dev',
} as const;
