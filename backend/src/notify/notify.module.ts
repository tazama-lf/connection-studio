import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { LoggerModule } from 'src/logger-service/logger-service.module';

@Module({
  providers: [NotifyService],
  imports: [
    LoggerModule,
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  exports: [NotifyService],
})
export class NotifyModule {}
