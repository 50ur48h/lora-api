import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { setupApp } from '../src/setup-app';
import { IDS, SEED_EMAILS } from '../prisma/seed-data';
import { signToken } from './helpers/auth';

/**
 * Proves the central promise of the platform: a tenant can never read another
 * tenant's data. We verify isolation at BOTH layers:
 *   1. The HTTP/application layer (Prisma tenant extension + guards).
 *   2. The PostgreSQL RLS layer, connecting as the non-superuser app role the
 *      API actually uses (DATABASE_URL -> app_user, which has NOBYPASSRLS).
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let secret: string;
  let appUserDb: PrismaClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    const config = app.get(AppConfigService);
    setupApp(app, config);
    await app.init();

    secret = config.supabaseJwtSecret;

    // Raw client bound to the RLS-enforced app role (NOT the migration superuser).
    appUserDb = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await app?.close();
    await appUserDb?.$disconnect();
  });

  const ownerAToken = () =>
    signToken(IDS.ownerA, secret, { email: SEED_EMAILS.ownerA });
  const ownerBToken = () =>
    signToken(IDS.ownerB, secret, { email: SEED_EMAILS.ownerB });

  describe('application layer', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/v1/stores').expect(401);
    });

    it('owner A sees only tenant A stores', async () => {
      const token = await ownerAToken();
      const res = await request(app.getHttpServer())
        .get('/v1/stores')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(IDS.storeA);
    });

    it('owner B sees only tenant B stores', async () => {
      const token = await ownerBToken();
      const res = await request(app.getHttpServer())
        .get('/v1/stores')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(IDS.storeB);
    });

    it('owner A cannot read tenant B store staff (404, not 403)', async () => {
      const token = await ownerAToken();
      await request(app.getHttpServer())
        .get(`/v1/stores/${IDS.storeB}/staff`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('owner A can read its own store staff', async () => {
      const token = await ownerAToken();
      const res = await request(app.getHttpServer())
        .get(`/v1/stores/${IDS.storeA}/staff`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.every((s: { storeId: string }) => s.storeId === IDS.storeA),
      ).toBe(true);
    });
  });

  describe('database RLS layer (app_user role)', () => {
    it('returns only tenant A rows when app.current_tenant = A', async () => {
      const rows = await appUserDb.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${IDS.tenantA}, true)`;
        return tx.$queryRaw<Array<{ tenantId: string }>>`SELECT "tenantId" FROM "Store"`;
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === IDS.tenantA)).toBe(true);
    });

    it('returns only tenant B rows when app.current_tenant = B', async () => {
      const rows = await appUserDb.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${IDS.tenantB}, true)`;
        return tx.$queryRaw<Array<{ tenantId: string }>>`SELECT "tenantId" FROM "Store"`;
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === IDS.tenantB)).toBe(true);
    });

    it('returns zero rows when no tenant GUC is set', async () => {
      const rows =
        await appUserDb.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Store"`;
      expect(rows).toHaveLength(0);
    });
  });
});
