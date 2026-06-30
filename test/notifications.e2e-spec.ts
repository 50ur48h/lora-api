import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';
import { runWithTenant } from '../src/common/tenancy/tenant-context';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { setupApp } from '../src/setup-app';
import { IDS } from '../prisma/seed-data';

const SLUG = 'glow-klcc';
const TEST_PHONE = '+60100000888';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let notifications: NotificationsService;
  let serviceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app, app.get(AppConfigService));
    await app.init();

    notifications = app.get(NotificationsService);
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
    const customers = await db.customer.findMany({
      where: { phone: TEST_PHONE },
      select: { id: true },
    });
    const customerIds = customers.map((c) => c.id);
    if (customerIds.length === 0) return;

    const bookings = await db.booking.findMany({
      where: { customerId: { in: customerIds } },
      select: { id: true },
    });
    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      await db.notification.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await db.customer.deleteMany({ where: { id: { in: customerIds } } });
  }

  it('records a SENT confirmation for a new booking', async () => {
    const date = '2027-03-01'; // Monday
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
        customer: { name: 'Notify Test', phone: TEST_PHONE },
      })
      .expect(201);
    const bookingId: string = created.body.id;

    // Exercise the notification logic deterministically (the queue worker runs
    // the same path asynchronously in production).
    await runWithTenant(
      { tenantId: IDS.tenantA, userId: SYSTEM_USER, role: Role.STAFF },
      () => notifications.sendBookingConfirmation(bookingId),
    );

    const sent = await db.notification.findFirst({
      where: { bookingId, status: 'SENT' },
    });
    expect(sent).not.toBeNull();
    expect(sent?.channel).toBe('WHATSAPP');
    expect(sent?.template).toBe('booking_confirmation');
    expect(sent?.sentAt).not.toBeNull();
  });
});
