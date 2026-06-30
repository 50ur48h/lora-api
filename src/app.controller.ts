import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/auth/public.decorator';
import { AppService } from './app.service';
import type { ServiceInfo } from './app.service';

@ApiTags('root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getInfo(): ServiceInfo {
    return this.appService.getInfo();
  }
}
