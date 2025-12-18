import { Module } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { LoggerModule } from 'src/logger-service/logger-service.module';
import { SftpController } from './sftp.controller';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  providers: [SftpService],
  exports: [SftpService],
  imports: [LoggerModule, NestConfigModule],
  controllers: [SftpController],
})
export class SftpModule {}
