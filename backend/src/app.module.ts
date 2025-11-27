import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger-service/logger-service.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule } from './config/config.module';
import { SimulationModule } from './simulation/simulation.module';
import { TazamaDataModelModule } from './tazama-data-model/tazama-data-model.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TokenExpiryInterceptor } from './auth/token-expiry.interceptor';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SftpModule } from './sftp/sftp.module';
import { NotifyModule } from './notify/notify.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { JobModule } from './job/job.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate,
    }),
    AuthModule,
    LoggerModule,
    AuditModule,
    ConfigModule,
    SimulationModule,
    TazamaDataModelModule,
    SftpModule,
    NotifyModule,
    SchedulerModule,
    JobModule,
    NotificationModule,
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
