import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { LoggerModule } from 'src/logger-service/logger-service.module';

@Module({
  providers: [NotifyService],
  imports: [LoggerModule],
})
export class NotifyModule {}
