import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/openapi';

/**
 * Emits `openapi.json` — the source of truth that `@lora/sdk` generates from.
 * Run with: `pnpm openapi:export`.
 */
async function main(): Promise<void> {
  // Build the module graph without opening DB/Redis connections — the Swagger
  // document is derived purely from metadata, so a full boot is unnecessary.
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    abortOnError: false,
    preview: true,
  });

  const document = buildOpenApiDocument(app);
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
