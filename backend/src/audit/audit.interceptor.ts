import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extract user information
    const user = request.user;
    const actor = user?.token?.clientId || user?.token?.sub || 'unknown-user';

    // Extract request details
    const method = request.method;
    const url = request.url;
    const controller = context.getClass().name;

    // Determine action based on method and route
    let action:
      | 'CREATE'
      | 'UPDATE'
      | 'DELETE'
      | 'ROLLBACK'
      | 'APPROVE'
      | 'PUBLISH'
      | null = null;
    if (url.includes('/mappings')) {
      if (method === 'POST' && !url.includes('/validate')) {
        action = 'CREATE';
      } else if (method === 'PATCH' || method === 'PUT') {
        action = 'UPDATE';
      } else if (method === 'DELETE') {
        action = 'DELETE';
      } else if (url.includes('/rollback')) {
        action = 'ROLLBACK';
      } else if (url.includes('/approve')) {
        action = 'APPROVE';
      } else if (url.includes('/publish')) {
        action = 'PUBLISH';
      }
    }

    // Extract version from request body
    const version = request.body?.version;

    return next.handle().pipe(
      tap((responseData) => {
        // Only log for mapping-related operations with valid actions
        if (controller === 'MappingController' && action !== null) {
          const mappingName =
            request.body?.name || request.params?.name || 'UNKNOWN_MAPPING';
          const endpointName = request.body?.endpointName;

          const auditEntry = {
            action,
            actor,
            mappingName,
            endpointName,
            version: version || responseData?.data?.version,
          };

          // Fire and forget - don't wait for audit logging to complete
          this.auditService.logMappingAction(auditEntry).catch((error) => {
            console.error('Failed to log audit entry:', error);
          });
        }
      }),
    );
  }
}
