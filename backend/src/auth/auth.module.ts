import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule } from 'src/logger-service/logger-service.module';
import { TazamaAuthGuard } from './tazama-auth.guard';

@Module({
  imports: [ConfigModule, LoggerModule, HttpModule],
  providers: [AuthService, TazamaAuthGuard],
  exports: [AuthService, TazamaAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
