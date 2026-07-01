import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { setupApp } from '../src/setup-app';
import { IDS, SEED_EMAILS } from '../prisma/seed-data';
import { signToken } from './helpers/auth';

const TEST_BOOKING_ID = 'e2eb0000-0000-4000-8000-000000000001';
const EPH_CUSTOMER_ID = 'e2ec0000-0000-4000-8000-000000000001';
const EPH_CUSTOMER_EMAIL = 'e2e-customer@glow.dev';
const INVITE_USER_ID = 'e2e10000-0000-4000-8000-000000000001';
const INVITE_NEW_SUB = 'e2e20000-0000-4000-8000-000000000002';
const INVITE_EMAIL = 'e2e-invite@glow.dev';

describe('Admin bookings (e2e)', () => {
  let app: INestApplication<App>;
  let secret: string;
  let db: PrismaClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    const config = app.get(AppConfigService);
    setupApp(app, config);
    await app.init();
    secret = config.supabaseJwtSecret;

    // Superuser client for setup/cleanup (bypasses RLS).
    db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    await cleanup();

    const service = await db.service.findFirstOrThrow({
      where: { storeId: IDS.storeA },
      select: { id: true, durationMin: true },
    });
    const startAt = new Date('2027-06-07T02:00:00.000Z'); // clear of other specs
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
    await db.booking.create({
      data: {
        id: TEST_BOOKING_ID,
        tenantId: IDS.tenantA,
        storeId: IDS.storeA,
        serviceId: service.id,
        staffId: IDS.staffA1,
        customerId: IDS.customerA1,
        startAt,
        endAt,
      },
    });

    await db.user.create({
      data: {
        id: EPH_CUSTOMER_ID,
        email: EPH_CUSTOMER_EMAIL,
        role: Role.CUSTOMER,
        tenantId: IDS.tenantA,
      },
    });
    await db.user.create({
      data: {
        id: INVITE_USER_ID,
        email: INVITE_EMAIL,
        role: Role.STAFF,
        tenantId: IDS.tenantA,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await db?.$disconnect();
    await app?.close();
  });

  async function cleanup() {
    await db.booking.deleteMany({ where: { id: TEST_BOOKING_ID } });
    // The invite user may have been re-keyed to the Supabase sub on link.
    await db.user.deleteMany({
      where: {
        OR: [
          { email: { in: [EPH_CUSTOMER_EMAIL, INVITE_EMAIL] } },
          { id: { in: [EPH_CUSTOMER_ID, INVITE_USER_ID, INVITE_NEW_SUB] } },
        ],
      },
    });
  }

  it('rejects unauthenticated access with 401', async () => {
    await request(app.getHttpServer()).get('/v1/bookings').expect(401);
  });

  it("returns the tenant's bookings to an owner", async () => {
    const token = await signToken(IDS.ownerA, secret, {
      email: SEED_EMAILS.ownerA,
    });
    const res = await request(app.getHttpServer())
      .get('/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const booking = res.body.find(
      (b: { id: string }) => b.id === TEST_BOOKING_ID,
    );
    expect(booking).toBeDefined();
    expect(booking.customerName).toBe('Nadia Tan');
    expect(booking.staffName).toBe('Aisha Rahman');
    expect(typeof booking.serviceName).toBe('string');
    expect(booking.status).toBe('REQUESTED');
  });

  it('does not leak tenant A bookings to tenant B', async () => {
    const token = await signToken(IDS.ownerB, secret, {
      email: SEED_EMAILS.ownerB,
    });
    const res = await request(app.getHttpServer())
      .get('/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.some((b: { id: string }) => b.id === TEST_BOOKING_ID)).toBe(
      false,
    );
  });

  it('forbids a CUSTOMER role (403)', async () => {
    const token = await signToken(EPH_CUSTOMER_ID, secret, {
      email: EPH_CUSTOMER_EMAIL,
    });
    await request(app.getHttpServer())
      .get('/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('provisions an invited user by email on first login', async () => {
    const token = await signToken(INVITE_NEW_SUB, secret, {
      email: INVITE_EMAIL,
    });
    const res = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(INVITE_NEW_SUB);
    expect(res.body.tenantId).toBe(IDS.tenantA);
    expect(res.body.role).toBe('STAFF');
  });
});
