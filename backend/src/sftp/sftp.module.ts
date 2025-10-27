import { Module } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { LoggerModule } from 'src/logger-service/logger-service.module';
import { SftpController } from './sftp.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [SftpService],
  exports: [SftpService],
  imports: [LoggerModule, ConfigModule],
  controllers: [SftpController]
})
export class SftpModule { }
