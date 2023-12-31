import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export enum Process {
  SPIDER_SYNC = 'SpiderSync',
}

export function GetConfig(): Configuration {
  return new Configuration();
}

export class Configuration {
  environment = process.env.ENVIRONMENT;
  version = 'v1';
  defaultLanguage = 'en';

  database: TypeOrmModuleOptions = {
    type: 'mssql',
    host: process.env.SQL_HOST,
    port: Number.parseInt(process.env.SQL_PORT ?? '1433'),
    username: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB,
    entities: ['dist/**/*.entity{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: process.env.SQL_SYNCHRONIZE === 'true',
    migrationsRun: process.env.SQL_MIGRATE === 'true',
    migrations: ['migration/*.js'],
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  auth = {
    jwt: {
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? 172800,
      },
    },
  };

  spider = {
    failAfterDays: 7,
    languages: ['EN', 'DE', 'FR', 'IT'],
  };

  // --- HELPERS --- //

  processDisabled = (processName: Process) =>
    process.env.DISABLED_PROCESSES === '*' || (process.env.DISABLED_PROCESSES?.split(',') ?? []).includes(processName);
}

@Injectable()
export class ConfigService {
  constructor(@Optional() readonly config?: Configuration) {
    Config = config ?? GetConfig();
  }
}

export let Config: Configuration;
