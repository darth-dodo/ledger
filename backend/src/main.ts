import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';
import { JsonLogger } from './logger';

async function bootstrap() {
  const config = loadConfig();
  const logger = new JsonLogger();

  const app = await NestFactory.create(AppModule, { logger });

  app.enableCors({ origin: config.corsOrigin });
  app.enableShutdownHooks();

  const shutdown = async () => {
    logger.log('Shutting down gracefully...', 'Bootstrap');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen(config.port);
  logger.log(
    `Application is running on: http://localhost:${config.port} [${config.nodeEnv}]`,
    'Bootstrap',
  );
}

bootstrap();
