import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

/** Service catalog management (tenant-scoped, authenticated writes). */
@Module({
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
