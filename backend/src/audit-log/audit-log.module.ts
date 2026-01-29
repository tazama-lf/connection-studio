import { Module, Global } from '@nestjs/common';
import { createAuditProvider } from '@tazama-lf/frms-coe-lib';

@Global() // Makes the provider available everywhere
@Module({
  providers: [
    // Provide the service name here
    createAuditProvider('connection-studio'),
  ],
  exports: [
    'AUDIT_LOGGER', // Export the provider by its token
  ],
})
export class AuditLogModule {}
