import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger-service/logger-service.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TokenExpiryInterceptor } from './auth/token-expiry.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate,
    }),
    AuthModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TokenExpiryInterceptor,
    },
  ],
})
export class AppModule {}
