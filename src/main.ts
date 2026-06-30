import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { buildOpenApiDocument } from './openapi';
import { setupApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  setupApp(app, config);

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.port);
  app.get(Logger).log(`lora-api listening on port ${config.port}`);
}

void bootstrap();
