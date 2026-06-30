import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { setupApp } from '../src/setup-app';

/**
 * The public storefront resolves a store by slug with no auth, then serves only
 * that store's tenant's data — proving the SECURITY DEFINER resolution + RLS
 * context bootstrap works end to end.
 */
describe('Public booking API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app, app.get(AppConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns a themed store with its active services (no auth)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/public/stores/glow-klcc')
      .expect(200);

    expect(res.body).toMatchObject({
      slug: 'glow-klcc',
      name: 'Glow KLCC',
      timezone: 'Asia/Kuala_Lumpur',
    });
    expect(res.body.theme?.colors?.primary).toBe('#0F766E');
    expect(res.body.services).toHaveLength(3);
    const names = res.body.services
      .map((s: { name: string }) => s.name)
      .sort();
    expect(names).toEqual([
      'Botox Consultation',
      'Chemical Peel',
      'Signature Facial',
    ]);
  });

  it('returns a store without a theme', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/public/stores/serene-bangsar')
      .expect(200);

    expect(res.body.name).toBe('Serene Bangsar');
    expect(res.body.theme).toBeNull();
    expect(res.body.services).toHaveLength(2);
  });

  it('never leaks another tenant services through the storefront', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/public/stores/glow-klcc')
      .expect(200);

    const names: string[] = res.body.services.map(
      (s: { name: string }) => s.name,
    );
    expect(names).not.toContain('Aromatherapy Massage');
    expect(names).not.toContain('Hydrating Facial');
  });

  it('returns 404 for an unknown slug', async () => {
    await request(app.getHttpServer())
      .get('/v1/public/stores/no-such-store')
      .expect(404);
  });
});
