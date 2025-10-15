import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FlowableService } from './flowable.service';
import { FlowableController } from './flowable.controller';
import { FlowableWebhookController } from './flowable-webhook.controller';
import { ConfigModule as TCSConfigModule } from '../config/config.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    forwardRef(() => TCSConfigModule),
    AuditModule,
  ],
  controllers: [FlowableController, FlowableWebhookController],
  providers: [FlowableService],
  exports: [FlowableService],
})
export class FlowableModule {}
