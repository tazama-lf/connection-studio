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
import { TazamaToken, validateTokenAndClaims } from '@tazama-lf/auth-lib';

@Injectable()
export class AuthService {
  /* c8 ignore next 5 -- NestJS DI constructor */
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  private extractToken(data): string {
    const token =
      typeof data === 'string'
        ? data
        : (data?.token ?? data?.access_token ?? data?.jwt ?? data?.user?.token);

    if (!token) {
      this.loggerService.error(
        'Auth service response missing token',
        AuthService.name,
      );
      throw new ServiceUnavailableException(
        'Authentication service unavailable',
      );
    }
    return token;
  }

  private validateUserToken(token: string, username: string): void {
    const claimsToCheck = (process.env.ALLOWED_ROLES ?? '')
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);

    if (claimsToCheck.length === 0) {
      return;
    }
    let claimResult;
    try {
      claimResult = validateTokenAndClaims(token, claimsToCheck);
    } catch (err) {
      const e = err as Error;
      this.loggerService.warn(
        `Token validation failed: ${e.message}`,
        AuthService.name,
      );
      return;
    }

    const decoded = jwt.decode(token) as TazamaToken;

    let innerDecoded: Record<string, unknown> = decoded;
    try {
      const innerToken =
        ((decoded as Record<string, unknown>).tokenString as
          | string
          | undefined) ?? token;
      const innerParsed = jwt.decode(innerToken);
      if (innerParsed && typeof innerParsed === 'object') {
        innerDecoded = innerParsed;
      }
    } catch (error) {
      this.loggerService.debug(
        'Failed to decode inner token, using outer token',
      );
    }
    const realmAccess = innerDecoded.realm_access as
      | { roles?: string[] }
      | undefined;

    const realmRoles =
      realmAccess?.roles?.map((role) => role.toLowerCase()) ?? [];

    const invalidTrsRoles = realmRoles.filter((role) =>
      role.startsWith('trs_'),
    );

    if (invalidTrsRoles.length > 0) {
      this.loggerService.warn(
        `User ${username} has unsupported roles: ${invalidTrsRoles.join(', ')}`,
        AuthService.name,
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    const hasRequiredClaim = claimsToCheck.some((claim) => claimResult[claim]);
    if (!hasRequiredClaim) {
      this.loggerService.warn(
        `User ${username} does not have any allowed role.`,
        AuthService.name,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ message: string; token: string; expiresIn: number | null }> {
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
        this.httpService.post(`${authUrl}/login`, { username, password }),
      );
      if (!response.data) {
        this.loggerService.error(
          'Auth service did not return a valid response',
          AuthService.name,
        );
        throw new ServiceUnavailableException(
          'Authentication service unavailable',
        );
      }
      this.loggerService.log('Auth service responded', AuthService.name);

      const token = this.extractToken(response.data);
      this.validateUserToken(token, username);
      return {
        message: 'Login successful',
        token,
        expiresIn:
          response.data?.expires_in ?? response.data?.expiresIn ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.handleLoginError(error);
    }
  }

  private handleLoginError(error: unknown): never {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string; error?: string };
      };
      message?: string;
    };
    if (axiosError.response?.status === 429) {
      const errorMessage =
        axiosError.response.data?.message ??
        axiosError.response.data?.error ??
        'Account temporarily locked due to too many failed login attempts.';
      this.loggerService.warn(
        `Account locked (429): ${errorMessage}`,
        AuthService.name,
      );
      throw new UnauthorizedException(errorMessage);
    }
    if (axiosError.response?.status === 401) {
      const errorMessage =
        axiosError.response.data?.message ??
        axiosError.response.data?.error ??
        'Invalid credentials';
      this.loggerService.error(
        `Authentication failed: ${errorMessage}`,
        AuthService.name,
      );
      throw new UnauthorizedException(errorMessage);
    }
    this.loggerService.error(
      `Auth service error during login: ${axiosError.message ?? 'Unknown error'}`,
      AuthService.name,
    );
    throw new ServiceUnavailableException('Authentication service unavailable');
  }

  public isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
      }
      return true;
    } catch (error) {
      this.loggerService.warn(
        `Failed to check token expiry: ${(error as Error).message}`,
      );
      return true;
    }
  }

  public getTokenTimeToExpiry(token: string): number {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
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
