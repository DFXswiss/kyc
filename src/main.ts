import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as appInsights from 'applicationinsights';
import * as cors from 'cors';
import { json } from 'express';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { AppModule } from './app.module';
import { Config } from './config/config';
import { ApiExceptionFilter } from './shared/filters/exception.filter';
import { DfxLogger } from './shared/services/dfx-logger';

async function bootstrap() {
  if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    appInsights.setup().setAutoDependencyCorrelation(true).setAutoCollectConsole(true, true);
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'dfx-kyc';
    appInsights.start();
  }

  const app = await NestFactory.create(AppModule);

  app.use(morgan('dev'));
  app.use(helmet());
  app.use(cors());

  app.use('*', json({ type: 'application/json', limit: '10mb' }));

  app.setGlobalPrefix(Config.version, { exclude: ['', 'version'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerOptions = new DocumentBuilder()
    .setTitle('DFX KYC')
    .setDescription(`DFX KYC API (updated on ${new Date().toLocaleString()})`)
    .setVersion(Config.version)
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('/swagger', app, swaggerDocument);

  await app.listen(process.env.PORT || 3000);

  new DfxLogger('Main').info(`Application ready ...`);
}

void bootstrap();
