import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  async login(username: string, password: string) {
    const authUrl = this.configService.get<string>('TAZAMA_AUTH_URL');
    if (!authUrl) {
      this.loggerService.error(
        'TAZAMA_AUTH_URL is not set in environment variables',
      );
      throw new ServiceUnavailableException(
        'Authentication service unavailable',
      );
    }
    try {
      const response = await firstValueFrom(
        this.httpService.post(authUrl, { username, password }),
      );
      if (!response?.data) {
        this.loggerService.error(
          'Auth service did not return a valid response',
          AuthService.name,
        );
        throw new ServiceUnavailableException(
          'Authentication service unavailable',
        );
      }
      this.loggerService.log('Auth service responded');
      const token =
        typeof response.data === 'string'
          ? response.data
          : response.data?.token ||
            response.data?.access_token ||
            response.data?.jwt ||
            response.data?.user?.token;
      this.loggerService.log(`Token received: ${token}`);
      this.loggerService.log('Login successful');
      return {
        message: 'Login successful',
        token,
        expiresIn:
          response.data?.expires_in ?? response.data?.expiresIn ?? null,
      };
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.loggerService.warn(`Invalid credentials for user ${username}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      this.loggerService.error(
        `Auth service error during login: ${error.message}`,
      );
      throw new ServiceUnavailableException(
        'Authentication service unavailable',
      );
    }
  }

  public isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
      }
      return true;
    } catch (error) {
      this.loggerService.warn(`Failed to check token expiry: ${error.message}`);
      return true;
    }
  }

  public getTokenTimeToExpiry(token: string): number {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        return Math.max(0, decoded.exp - currentTime);
      }
      return 0;
    } catch (error) {
      this.loggerService.warn(`Failed to get time to expiry: ${error.message}`);
      return 0;
    }
  }
}
