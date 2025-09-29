import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MappingService } from './mapping.service';
import { MappingController } from './mapping.controller';
import { MappingRepository } from './mapping.repository';
import { AuditModule } from '../audit/audit.module';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { AuditInterceptor } from '../audit/audit.interceptor';
@Module({
  imports: [AuditModule, forwardRef(() => EndpointsModule)],
  controllers: [MappingController],
  providers: [
    MappingService,
    MappingRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [MappingService],
})
export class MappingModule {}
