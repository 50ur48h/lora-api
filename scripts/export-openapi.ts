import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

/**
 * Emits `openapi.json` — the source of truth that `lora-sdk` generates from.
 * Requires Postgres + Redis to be reachable (the app boots fully). Run with:
 *   pnpm openapi:export
 */
async function main(): Promise<void> {
  // Build the module graph without opening DB/Redis connections — the Swagger
  // document is derived purely from metadata, so a full boot is unnecessary.
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    abortOnError: false,
    preview: true,
  });
  const config = new DocumentBuilder()
    .setTitle('LORA API')
    .setDescription('White-label booking platform API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = resolve(process.cwd(), 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  await app.close();

  console.log(`OpenAPI spec written to ${outPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to export OpenAPI spec:', err);
    process.exit(1);
  });
