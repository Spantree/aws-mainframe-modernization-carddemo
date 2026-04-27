/**
 * CardDemo TypeScript migration — Bun-native NestJS bootstrap.
 *
 * Replaces the JCL/CICS region as the application entry point. Bun is the
 * runtime; NestJS provides the DI container, controller routing, and HTTP
 * lifecycle. The Express adapter keeps middleware (e.g. express-session) in
 * line with the controllers' @Session() usage.
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'carddemo-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    }),
  );

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
}

void bootstrap();
