import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

/** Staff management (tenant-scoped, authenticated writes). */
@Module({
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
