import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { LoggerModule } from 'src/logger-service/logger-service.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [],
  providers: [NotifyService],
  imports: [LoggerModule, ConfigModule],
  exports: [NotifyService],
})
export class NotifyModule {}
