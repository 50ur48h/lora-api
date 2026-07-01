import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

/** Admin-facing booking queries (tenant-scoped, authenticated). */
@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
