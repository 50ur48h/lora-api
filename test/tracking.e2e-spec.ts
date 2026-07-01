import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { setupApp } from '../src/setup-app';

const SLUG = 'glow-klcc';
const TEST_PHONE = '+60100000999';

describe('Booking tracking (e2e)', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let serviceId: string;
  let reference: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app, app.get(AppConfigService));
    await app.init();

    db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    await cleanup();

    const store = await request(app.getHttpServer())
      .get(`/v1/public/stores/${SLUG}`)
      .expect(200);
    serviceId = store.body.services[0].id;

    const date = '2027-09-06'; // Monday, clear of other specs
    const avail = await request(app.getHttpServer())
      .get(
        `/v1/public/stores/${SLUG}/services/${serviceId}/availability?date=${date}`,
      )
      .expect(200);
    const slot = avail.body.slots[0];

    const created = await request(app.getHttpServer())
      .post(`/v1/public/stores/${SLUG}/bookings`)
      .send({
        serviceId,
        staffId: slot.staffId,
        startAt: slot.startAt,
        customer: { name: 'Track Test', phone: TEST_PHONE },
      })
      .expect(201);
    reference = created.body.reference;
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

  it('returns a human-friendly reference on booking', () => {
    expect(reference).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  });

  it('tracks a booking by its reference without auth', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/public/bookings/${reference}`)
      .expect(200);
    expect(res.body.reference).toBe(reference);
    expect(res.body.status).toBe('REQUESTED');
    expect(res.body.storeSlug).toBe(SLUG);
    expect(res.body.serviceName).toBeTruthy();
    expect(res.body.staffName).toBeTruthy();
    expect(res.body.customerName).toBe('Track Test');
  });

  it('matches the reference case-insensitively', async () => {
    await request(app.getHttpServer())
      .get(`/v1/public/bookings/${reference.toLowerCase()}`)
      .expect(200);
  });

  it('404s an unknown reference', async () => {
    await request(app.getHttpServer())
      .get('/v1/public/bookings/ZZ99ZZ99')
      .expect(404);
  });
});
