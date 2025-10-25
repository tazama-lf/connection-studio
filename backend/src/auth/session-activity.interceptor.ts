import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SessionManagerService } from './session-manager.service';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(private readonly sessionManager: SessionManagerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const user = request.user;
    if (user) {
      const userId = user?.token?.clientId || user?.userId;
      const tenantId = user?.token?.tenantId || user?.tenantId;
      const token = request.headers.authorization?.split(' ')[1];

      if (userId && tenantId && token) {
        this.sessionManager.recordActivity(userId, tenantId, token);
      }
    }

    return next.handle().pipe(
      tap(() => {
        // After successful request, add session info to response headers
        const user = request.user;
        if (user) {
          const userId = user?.token?.clientId || user?.userId;
          const tenantId = user?.token?.tenantId || user?.tenantId;

          if (userId && tenantId) {
            const timeRemaining = this.sessionManager.getSessionTimeRemaining(
              userId,
              tenantId,
            );

            // Add session timeout info to response headers
            response.setHeader('X-Session-Timeout-Remaining', timeRemaining);
            response.setHeader(
              'X-Session-Timeout-Minutes',
              Math.floor(timeRemaining / 60),
            );

            response.setHeader(
              'X-Session-Active',
              this.sessionManager.isSessionActive(userId, tenantId),
            );
          }
        }
      }),
    );
  }
}
