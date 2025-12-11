import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class TokenExpiryInterceptor implements NestInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    if (authorizationHeader) {
      const token = authorizationHeader.replace('Bearer ', '');

      if (this.authService.isTokenExpired(token)) {
        throw new UnauthorizedException('Token has expired');
      }
    }

    return next.handle();
  }
}
