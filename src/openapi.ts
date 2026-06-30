import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { API_PREFIX, UNVERSIONED_ROUTES } from './setup-app';

/**
 * Builds the LORA OpenAPI document. This is the single source of truth used by
 * both the runtime Swagger UI (`/docs`) and the `openapi.json` export that
 * `@lora/sdk` is generated from.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('LORA API')
    .setDescription('White-label booking platform API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  applyGlobalPrefix(document);
  return document;
}

/**
 * Swagger reads route metadata from the controllers, which does NOT include the
 * global prefix applied at runtime via `setGlobalPrefix`. Re-apply it here so
 * the document matches the URLs the server actually serves.
 */
function applyGlobalPrefix(document: OpenAPIObject): void {
  if (!document.paths) return;
  const unversioned = new Set<string>(UNVERSIONED_ROUTES);
  document.paths = Object.fromEntries(
    Object.entries(document.paths).map(([path, item]) => [
      unversioned.has(path) ? path : `/${API_PREFIX}${path}`,
      item,
    ]),
  );
}
