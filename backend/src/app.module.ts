import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger-service/logger-service.module';
import { SchemasModule } from './schemas/schemas.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule } from './config/config.module';
import { SimulationModule } from './simulation/simulation.module';
import { TazamaDataModelModule } from './tazama-data-model/tazama-data-model.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TokenExpiryInterceptor } from './auth/token-expiry.interceptor';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SessionActivityInterceptor } from './auth/session-activity.interceptor';
import { JobModule } from './job/job.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DryRunModule } from './dry-run/dry-run.module';
import { DatabaseModule } from './database/database.module';
import { SftpModule } from './sftp/sftp.module';
import { NotifyModule } from './notify/notify.module';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate,
    }),
    AuthModule,
    LoggerModule,
    SchemasModule,
    AuditModule,
    ConfigModule,
    SimulationModule,
    TazamaDataModelModule,
    JobModule,
    SchedulerModule,
    DryRunModule,
    DatabaseModule,
    SftpModule,
    NotifyModule,
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
      useClass: SessionActivityInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
