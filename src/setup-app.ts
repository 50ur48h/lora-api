import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import helmet from 'helmet';
import type { AppConfigService } from './config/app-config.service';

/** Version prefix applied to all application routes. */
export const API_PREFIX = 'v1';

/**
 * Routes served at the root, OUTSIDE the version prefix. Must stay in sync with
 * the `exclude` list passed to `setGlobalPrefix` below — the OpenAPI export
 * relies on it to reproduce the real paths.
 */
export const UNVERSIONED_ROUTES = ['/', '/health'] as const;

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

  app.setGlobalPrefix(API_PREFIX, {
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
