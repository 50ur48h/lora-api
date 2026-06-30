import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { setupApp } from '../src/setup-app';

const SLUG = 'glow-klcc';
const TEST_PHONE = '+60100000777';

describe('Booking creation (e2e)', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let serviceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app, app.get(AppConfigService));
    await app.init();

    // Superuser client for cleanup (bypasses RLS).
    db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    await cleanup();

    const store = await request(app.getHttpServer())
      .get(`/v1/public/stores/${SLUG}`)
      .expect(200);
    serviceId = store.body.services[0].id;
  });

  afterAll(async () => {
    await cleanup();
    await db?.$disconnect();
    await app?.close();
  });

  async function cleanup() {
    await db.booking.deleteMany({ where: { customer: { phone: TEST_PHONE } } });
    await db.customer.deleteMany({ where: { phone: TEST_PHONE } });
  }

  async function firstSlot(date: string) {
    const res = await request(app.getHttpServer())
      .get(`/v1/public/stores/${SLUG}/services/${serviceId}/availability?date=${date}`)
      .expect(200);
    return res.body.slots[0] as { startAt: string; staffId: string };
  }

  const customer = { name: 'Test User', phone: TEST_PHONE };

  it('books an open slot, removes it from availability, and rejects a repeat', async () => {
    const date = '2027-02-01'; // Monday
    const slot = await firstSlot(date);
    expect(slot).toBeDefined();

    const body = { serviceId, staffId: slot.staffId, startAt: slot.startAt, customer };

    const created = await request(app.getHttpServer())
      .post(`/v1/public/stores/${SLUG}/bookings`)
      .send(body)
      .expect(201);
    expect(created.body.status).toBe('REQUESTED');
    expect(created.body.startAt).toBe(slot.startAt);
    expect(created.body.serviceName).toBeTruthy();
    expect(created.body.staffName).toBeTruthy();

    // The booked slot is gone for that staff.
    const after = await request(app.getHttpServer())
      .get(`/v1/public/stores/${SLUG}/services/${serviceId}/availability?date=${date}`)
      .expect(200);
    const taken = after.body.slots.find(
      (s: { startAt: string; staffId: string }) =>
        s.startAt === slot.startAt && s.staffId === slot.staffId,
    );
    expect(taken).toBeUndefined();

    // Re-booking the same slot is rejected.
    await request(app.getHttpServer())
      .post(`/v1/public/stores/${SLUG}/bookings`)
      .send(body)
      .expect(409);
  });

  it('rejects an invalid body (400)', async () => {
    await request(app.getHttpServer())
      .post(`/v1/public/stores/${SLUG}/bookings`)
      .send({ serviceId, staffId: 'not-a-uuid', startAt: 'nope' })
      .expect(400);
  });

  it('404s an unknown service', async () => {
    const slot = await firstSlot('2027-02-08');
    await request(app.getHttpServer())
      .post(`/v1/public/stores/${SLUG}/bookings`)
      .send({
        serviceId: '00000000-0000-4000-8000-000000000000',
        staffId: slot.staffId,
        startAt: slot.startAt,
        customer,
      })
      .expect(404);
  });

  it('409s a slot in the past', async () => {
    const slot = await firstSlot('2027-02-15');
    await request(app.getHttpServer())
      .post(`/v1/public/stores/${SLUG}/bookings`)
      .send({
        serviceId,
        staffId: slot.staffId,
        startAt: '2020-01-01T02:00:00.000Z',
        customer,
      })
      .expect(409);
  });
});
