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

const TEST_BOOKING_ID = 'e2e30000-0000-4000-8000-000000000001';
const EPH_CUSTOMER_ID = 'e2e30000-0000-4000-8000-0000000000c1';
const EPH_CUSTOMER_EMAIL = 'e2e-mgmt-customer@glow.dev';
const NAME_MARKER = 'E2E Mgmt';

describe('Admin management (e2e)', () => {
  let app: INestApplication<App>;
  let secret: string;
  let db: PrismaClient;
  let ownerToken: string;
  let ownerBToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    const config = app.get(AppConfigService);
    setupApp(app, config);
    await app.init();
    secret = config.supabaseJwtSecret;

    db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    await cleanup();

    const service = await db.service.findFirstOrThrow({
      where: { storeId: IDS.storeA },
      select: { id: true, durationMin: true },
    });
    const startAt = new Date('2027-08-09T02:00:00.000Z'); // clear of other specs
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

    ownerToken = await signToken(IDS.ownerA, secret, {
      email: SEED_EMAILS.ownerA,
    });
    ownerBToken = await signToken(IDS.ownerB, secret, {
      email: SEED_EMAILS.ownerB,
    });
    customerToken = await signToken(EPH_CUSTOMER_ID, secret, {
      email: EPH_CUSTOMER_EMAIL,
    });
  });

  afterAll(async () => {
    await cleanup();
    await db?.$disconnect();
    await app?.close();
  });

  async function cleanup() {
    await db.booking.deleteMany({ where: { id: TEST_BOOKING_ID } });
    await db.service.deleteMany({
      where: { tenantId: IDS.tenantA, name: { startsWith: NAME_MARKER } },
    });
    await db.staff.deleteMany({
      where: { tenantId: IDS.tenantA, name: { startsWith: NAME_MARKER } },
    });
    await db.user.deleteMany({ where: { id: EPH_CUSTOMER_ID } });
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('booking status transitions', () => {
    it('confirms a requested booking', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/bookings/${TEST_BOOKING_ID}/status`)
        .set(auth(ownerToken))
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(res.body.status).toBe('CONFIRMED');
    });

    it('rejects an invalid transition (409)', async () => {
      await request(app.getHttpServer())
        .patch(`/v1/bookings/${TEST_BOOKING_ID}/status`)
        .set(auth(ownerToken))
        .send({ status: 'REQUESTED' })
        .expect(409);
    });

    it('does not let another tenant touch the booking (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/v1/bookings/${TEST_BOOKING_ID}/status`)
        .set(auth(ownerBToken))
        .send({ status: 'CANCELLED' })
        .expect(404);
    });

    it('rejects an invalid status value (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/v1/bookings/${TEST_BOOKING_ID}/status`)
        .set(auth(ownerToken))
        .send({ status: 'NOT_A_STATUS' })
        .expect(400);
    });
  });

  describe('services', () => {
    let serviceId: string;

    it('creates a service', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/services')
        .set(auth(ownerToken))
        .send({
          storeId: IDS.storeA,
          name: `${NAME_MARKER} Facial`,
          durationMin: 45,
          priceCents: 12000,
        })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.active).toBe(true);
      expect(res.body.bufferMin).toBe(0);
      serviceId = res.body.id;
    });

    it('lists the new service for the store', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/services?storeId=${IDS.storeA}`)
        .set(auth(ownerToken))
        .expect(200);
      expect(res.body.some((s: { id: string }) => s.id === serviceId)).toBe(
        true,
      );
    });

    it('updates and deactivates the service', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/services/${serviceId}`)
        .set(auth(ownerToken))
        .send({ priceCents: 13500, active: false })
        .expect(200);
      expect(res.body.priceCents).toBe(13500);
      expect(res.body.active).toBe(false);
    });

    it('forbids a customer from creating a service (403)', async () => {
      await request(app.getHttpServer())
        .post('/v1/services')
        .set(auth(customerToken))
        .send({
          storeId: IDS.storeA,
          name: `${NAME_MARKER} Nope`,
          durationMin: 30,
          priceCents: 1000,
        })
        .expect(403);
    });
  });

  describe('staff', () => {
    let staffId: string;

    it('creates a staff member', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/staff')
        .set(auth(ownerToken))
        .send({
          storeId: IDS.storeA,
          name: `${NAME_MARKER} Therapist`,
          jobTitle: 'Facialist',
        })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.active).toBe(true);
      staffId = res.body.id;
    });

    it('lists and updates the staff member', async () => {
      const list = await request(app.getHttpServer())
        .get(`/v1/staff?storeId=${IDS.storeA}`)
        .set(auth(ownerToken))
        .expect(200);
      expect(list.body.some((s: { id: string }) => s.id === staffId)).toBe(
        true,
      );

      const res = await request(app.getHttpServer())
        .patch(`/v1/staff/${staffId}`)
        .set(auth(ownerToken))
        .send({ active: false })
        .expect(200);
      expect(res.body.active).toBe(false);
    });
  });
});
