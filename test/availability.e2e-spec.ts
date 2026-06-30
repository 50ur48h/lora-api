import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { setupApp } from '../src/setup-app';

describe('Availability API (e2e)', () => {
  let app: INestApplication<App>;
  let serviceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app, app.get(AppConfigService));
    await app.init();

    const store = await request(app.getHttpServer())
      .get('/v1/public/stores/glow-klcc')
      .expect(200);
    serviceId = store.body.services[0].id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const url = (sid: string, date: string) =>
    `/v1/public/stores/glow-klcc/services/${sid}/availability?date=${date}`;

  it('returns open slots on a working day', async () => {
    const res = await request(app.getHttpServer())
      .get(url(serviceId, '2027-01-04')) // Monday
      .expect(200);

    expect(res.body.date).toBe('2027-01-04');
    expect(res.body.slots.length).toBeGreaterThan(0);
    // 10:00 Kuala Lumpur (UTC+8) == 02:00 UTC.
    expect(res.body.slots[0].startAt).toBe('2027-01-04T02:00:00.000Z');
    expect(res.body.slots[0]).toHaveProperty('staffId');
  });

  it('returns no slots on a closed day (Sunday)', async () => {
    const res = await request(app.getHttpServer())
      .get(url(serviceId, '2027-01-03')) // Sunday
      .expect(200);
    expect(res.body.slots).toHaveLength(0);
  });

  it('rejects a malformed date', async () => {
    await request(app.getHttpServer())
      .get(url(serviceId, '01-2027-04'))
      .expect(400);
  });

  it('404s an unknown store slug', async () => {
    await request(app.getHttpServer())
      .get(
        `/v1/public/stores/no-such-store/services/${serviceId}/availability?date=2027-01-04`,
      )
      .expect(404);
  });

  it('404s a service that does not belong to the store', async () => {
    await request(app.getHttpServer())
      .get(url('00000000-0000-4000-8000-000000000000', '2027-01-04'))
      .expect(404);
  });
});
