import { Injectable } from '@nestjs/common';

export interface ServiceInfo {
  name: string;
  status: 'ok';
  version: string;
}

@Injectable()
export class AppService {
  getInfo(): ServiceInfo {
    return {
      name: 'lora-api',
      status: 'ok',
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }
}
