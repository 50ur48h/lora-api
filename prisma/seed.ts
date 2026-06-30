import { PrismaClient, Role } from '@prisma/client';
import { IDS, SEED_EMAILS } from './seed-data';

/**
 * Seeds two tenants with stores, staff, services, a theme, and customers.
 *
 * Connects via DIRECT_URL (superuser) so it bypasses RLS — the app role cannot
 * insert across tenants. Idempotent: safe to run repeatedly.
 */
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
});

async function main(): Promise<void> {
  // ---- Tenant A — "Glow Med-Spa" ----
  await prisma.tenant.upsert({
    where: { id: IDS.tenantA },
    create: { id: IDS.tenantA, name: 'Glow Med-Spa', plan: 'trial' },
    update: { name: 'Glow Med-Spa' },
  });

  await prisma.store.upsert({
    where: { id: IDS.storeA },
    create: {
      id: IDS.storeA,
      tenantId: IDS.tenantA,
      name: 'Glow KLCC',
      slug: 'glow-klcc',
      timezone: 'Asia/Kuala_Lumpur',
    },
    update: { name: 'Glow KLCC' },
  });

  await prisma.theme.upsert({
    where: { storeId: IDS.storeA },
    create: {
      tenantId: IDS.tenantA,
      storeId: IDS.storeA,
      colors: { primary: '#0F766E', accent: '#F59E0B' },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
    },
    update: {},
  });

  await upsertUser(
    IDS.admin,
    SEED_EMAILS.admin,
    Role.PLATFORM_ADMIN,
    null,
    null,
  );
  await upsertUser(
    IDS.ownerA,
    SEED_EMAILS.ownerA,
    Role.TENANT_OWNER,
    IDS.tenantA,
    null,
  );
  await upsertUser(
    IDS.managerA,
    SEED_EMAILS.managerA,
    Role.STORE_MANAGER,
    IDS.tenantA,
    IDS.storeA,
  );

  await upsertStaff(
    IDS.staffA1,
    IDS.tenantA,
    IDS.storeA,
    'Aisha Rahman',
    'Aesthetician',
  );
  await upsertStaff(
    IDS.staffA2,
    IDS.tenantA,
    IDS.storeA,
    'Mei Ling',
    'Therapist',
  );

  await seedAvailability(IDS.tenantA, IDS.staffA1);
  await seedAvailability(IDS.tenantA, IDS.staffA2);

  await upsertService(
    IDS.tenantA,
    IDS.storeA,
    'glow-facial',
    'Signature Facial',
    60,
    15_000,
  );
  await upsertService(
    IDS.tenantA,
    IDS.storeA,
    'glow-botox',
    'Botox Consultation',
    30,
    0,
  );
  await upsertService(
    IDS.tenantA,
    IDS.storeA,
    'glow-peel',
    'Chemical Peel',
    45,
    22_000,
  );

  await upsertCustomer(
    IDS.customerA1,
    IDS.tenantA,
    'Nadia Tan',
    '+60123456789',
  );

  // ---- Tenant B — "Serene Aesthetics" ----
  await prisma.tenant.upsert({
    where: { id: IDS.tenantB },
    create: { id: IDS.tenantB, name: 'Serene Aesthetics', plan: 'trial' },
    update: { name: 'Serene Aesthetics' },
  });

  await prisma.store.upsert({
    where: { id: IDS.storeB },
    create: {
      id: IDS.storeB,
      tenantId: IDS.tenantB,
      name: 'Serene Bangsar',
      slug: 'serene-bangsar',
      timezone: 'Asia/Kuala_Lumpur',
    },
    update: { name: 'Serene Bangsar' },
  });

  await upsertUser(
    IDS.ownerB,
    SEED_EMAILS.ownerB,
    Role.TENANT_OWNER,
    IDS.tenantB,
    null,
  );

  await upsertStaff(
    IDS.staffB1,
    IDS.tenantB,
    IDS.storeB,
    'Sofia Abdullah',
    'Aesthetician',
  );
  await upsertStaff(
    IDS.staffB2,
    IDS.tenantB,
    IDS.storeB,
    'Priya Nair',
    'Therapist',
  );

  await seedAvailability(IDS.tenantB, IDS.staffB1);
  await seedAvailability(IDS.tenantB, IDS.staffB2);

  await upsertService(
    IDS.tenantB,
    IDS.storeB,
    'serene-massage',
    'Aromatherapy Massage',
    90,
    18_000,
  );
  await upsertService(
    IDS.tenantB,
    IDS.storeB,
    'serene-facial',
    'Hydrating Facial',
    60,
    16_000,
  );

  await upsertCustomer(IDS.customerB1, IDS.tenantB, 'Lim Wei', '+60198765432');

  console.log('Seed complete: tenants, stores, staff, services, availability.');
}

async function upsertUser(
  id: string,
  email: string,
  role: Role,
  tenantId: string | null,
  storeId: string | null,
): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: { id, email, role, tenantId, storeId },
    update: { email, role, tenantId, storeId },
  });
}

async function upsertStaff(
  id: string,
  tenantId: string,
  storeId: string,
  name: string,
  jobTitle: string,
): Promise<void> {
  await prisma.staff.upsert({
    where: { id },
    create: { id, tenantId, storeId, name, jobTitle },
    update: { name, jobTitle },
  });
}

async function upsertService(
  tenantId: string,
  storeId: string,
  slug: string,
  name: string,
  durationMin: number,
  priceCents: number,
): Promise<void> {
  // Services have no natural unique key beyond id; use a deterministic id
  // derived from the store + slug so re-seeding is idempotent.
  const id = deterministicUuid(`${storeId}:${slug}`);
  await prisma.service.upsert({
    where: { id },
    create: { id, tenantId, storeId, name, durationMin, priceCents },
    update: { name, durationMin, priceCents },
  });
}

async function upsertCustomer(
  id: string,
  tenantId: string,
  name: string,
  phone: string,
): Promise<void> {
  await prisma.customer.upsert({
    where: { id },
    create: { id, tenantId, name, phone },
    update: { name, phone },
  });
}

async function seedAvailability(
  tenantId: string,
  staffId: string,
): Promise<void> {
  // Monday–Saturday, 10:00–18:00 local.
  for (let weekday = 1; weekday <= 6; weekday++) {
    const id = deterministicUuid(`avail:${staffId}:${weekday}`);
    await prisma.availability.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        staffId,
        weekday,
        startTime: '10:00',
        endTime: '18:00',
      },
      update: { startTime: '10:00', endTime: '18:00' },
    });
  }
}

/** Stable UUID-shaped id from an arbitrary key (for idempotent seeding). */
function deterministicUuid(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-${hex.padStart(12, '0').slice(0, 12)}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
