import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../../modules/users/users.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Registers authentication + authorization as global guards. Order matters:
 * JWT verification first (populates req.user), then role enforcement.
 * Routes opt out of auth with `@Public()`.
 */
@Module({
  imports: [UsersModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class SecurityModule {}
