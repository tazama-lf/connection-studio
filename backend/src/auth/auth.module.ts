import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule } from 'src/logger-service/logger-service.module';
import { TazamaAuthGuard } from './tazama-auth.guard';
import { AuditModule } from '../audit/audit.module';
import { SessionManagerService } from './session-manager.service';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule, HttpModule, AuditModule],
  providers: [AuthService, TazamaAuthGuard, SessionManagerService],
  exports: [AuthService, TazamaAuthGuard, SessionManagerService],
  controllers: [AuthController],
})
export class AuthModule {}
