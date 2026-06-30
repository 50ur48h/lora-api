import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import IORedis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    private readonly config: AppConfigService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    const client = new IORedis(this.config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      return pong === 'PONG'
        ? indicator.up()
        : indicator.down({ message: 'unexpected ping response' });
    } catch (error) {
      client.disconnect();
      return indicator.down({ message: (error as Error).message });
    }
  }
}
