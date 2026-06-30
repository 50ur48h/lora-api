import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AppConfigModule } from './config/app-config.module';
import { AppLoggerModule } from './common/logging/logger.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { SecurityModule } from './common/auth/security.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TenantContextInterceptor } from './common/tenancy/tenant-context.interceptor';
import { QueuesModule } from './queues/queues.module';
import { HealthModule } from './health/health.module';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PublicModule } from './modules/public/public.module';
import { StoresModule } from './modules/stores/stores.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { StaffModule } from './modules/staff/staff.module';
import { ServicesModule } from './modules/services/services.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    QueuesModule,
    SecurityModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Cross-cutting
    HealthModule,

    // Domain modules
    UsersModule,
    AuthModule,
    PublicModule,
    StoresModule,
    TenantsModule,
    StaffModule,
    ServicesModule,
    CustomersModule,
    BookingsModule,
    PaymentsModule,
    LoyaltyModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
