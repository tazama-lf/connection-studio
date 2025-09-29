import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger-service/logger-service.module';
import { KnexModule } from '../knex/knex.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { SchemasModule } from './schemas/schemas.module';
import { AuditModule } from './audit/audit.module';
import { MappingModule } from './mappings/mapping.module';
import { DataModelExtensionModule } from './data-model-extensions/data-model-extension.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TokenExpiryInterceptor } from './auth/token-expiry.interceptor';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate,
    }),
    AuthModule,
    LoggerModule,
    EndpointsModule,
    SchemasModule,
    AuditModule,
    MappingModule,
    DataModelExtensionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TokenExpiryInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
