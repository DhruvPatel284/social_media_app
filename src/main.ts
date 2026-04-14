/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { join } from 'path';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import * as flash from 'connect-flash';
import * as session from 'express-session';
import * as methodOverride from 'method-override';
import { Logger } from 'winston';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { log } from './common/utils/logger';
import { ResponseUtil } from './common/utils/response.util';
import { AppModule } from './modules/app/app.module';
import * as express from 'express';
import { DataSource } from 'typeorm';
import { seedDatabase } from './database/seed';
import { AuthService } from './modules/auth/auth.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fileUpload = require('express-fileupload');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const expressLayouts = require('express-ejs-layouts');
declare global {
  // Add this to make log available everywhere
  var log: Logger;
}
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set up view engine
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.set('layout', 'layouts/layout');
  app.use(expressLayouts);
  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    session({
      secret: process.env.SESSION_SECRET || 'nodedemo',
      resave: false,
      saveUninitialized: true,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (global as any).log = log;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(flash());

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  //app.use(fileUpload());

  app.use(methodOverride('_method'));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formattedErrors = ResponseUtil.formatErrors(errors);
        const message = Object.values(formattedErrors)[0]?.[0];
        return new BadRequestException(
          ResponseUtil.validationError(formattedErrors, message),
        );
      },
    }),
  );
    // const dataSource = app.get(DataSource);
    // const authService = app.get(AuthService);

    // if (!dataSource.isInitialized) {
    //   await dataSource.initialize();
    // }

    // await seedDatabase(dataSource, authService);
  
  const port = process.env.PORT ?? 3001

  await app.listen(port);
}
void bootstrap();
