import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import helmet from 'helmet';
import type { AppConfigService } from './config/app-config.service';

/**
 * Applies the cross-cutting HTTP configuration shared by the runtime server
 * (main.ts) and the e2e tests so both behave identically.
 */
export function setupApp(
  app: INestApplication,
  config: AppConfigService,
): void {
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
  });

  app.setGlobalPrefix('v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();
}
