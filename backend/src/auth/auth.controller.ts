import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  HttpCode,
  Query,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { AuthService } from './auth.service';
import { User } from './user.decorator';
import { TazamaAuthGuard } from './tazama-auth.guard';
import { RequireClaims, TazamaClaims } from './auth.decorator';
import { AuditService } from '../audit/audit.service';
import { SessionManagerService } from './session-manager.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly sessionManager: SessionManagerService,
    private readonly logger: LoggerService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { username: string; password: string }) {
    try {
      this.logger.log(`Attempting login for user ${body.username}`);
      const result = await this.authService.login(body.username, body.password);
      this.logger.log(`User ${JSON.stringify(result)} logged in successfully`);
      const response: any = {
        message: 'Login successful',
        token: result.token,
      };
      if (result.expiresIn) {
        response.expiresIn = result.expiresIn;
      }
      return response;
    } catch (error) {
      this.logger.warn(
        `Login failed for user ${body.username}: ${error.message}`,
        AuthController.name,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @UseGuards(TazamaAuthGuard)
  @RequireClaims(TazamaClaims.VIEW_PROFILE)
  @Get('me')
  getMe(@User() user: any) {
    return user;
  }

  @UseGuards(TazamaAuthGuard)
  @RequireClaims(TazamaClaims.VIEW_PROFILE)
  @Get('audit-logs')
  async getAuditLogs(
    @User() user: any,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('actor') actor?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = user?.token?.tenantId || 'default';
    const parsedLimit = limit ? parseInt(limit, 10) : 100;

    const logs = await this.auditService.getAuditLogs(
      tenantId,
      entityType,
      actor,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      parsedLimit,
    );

    return {
      success: true,
      data: logs,
      count: logs.length,
      filters: {
        tenantId,
        entityType,
        actor,
        startDate,
        endDate,
        limit: parsedLimit,
      },
    };
  }

  @UseGuards(TazamaAuthGuard)
  @RequireClaims(TazamaClaims.VIEW_PROFILE)
  @Get('session/status')
  getSessionStatus(@User() user: any) {
    const userId = user?.token?.clientId || user?.userId;
    const tenantId = user?.token?.tenantId || user?.tenantId;

    const sessionInfo = this.sessionManager.getSessionInfo(userId, tenantId);
    const timeRemaining = this.sessionManager.getSessionTimeRemaining(
      userId,
      tenantId,
    );

    return {
      success: true,
      session: {
        ...sessionInfo,
        timeRemainingSeconds: timeRemaining,
        timeRemainingMinutes: Math.floor(timeRemaining / 60),
        sessionTimeoutMinutes: 30,
      },
    };
  }

  @UseGuards(TazamaAuthGuard)
  @RequireClaims(TazamaClaims.VIEW_PROFILE)
  @Post('session/refresh')
  @HttpCode(200)
  refreshSession(@User() user: any) {
    const userId = user?.token?.clientId || user?.userId;
    const tenantId = user?.token?.tenantId || user?.tenantId;
    const tokenString = user?.token?.tokenString || '';

    // Record activity to extend session
    this.sessionManager.recordActivity(userId, tenantId, tokenString);

    const timeRemaining = this.sessionManager.getSessionTimeRemaining(
      userId,
      tenantId,
    );

    this.logger.log(`Session refreshed for user ${userId}, tenant ${tenantId}`);

    return {
      success: true,
      message: 'Session refreshed successfully',
      timeRemainingSeconds: timeRemaining,
      timeRemainingMinutes: Math.floor(timeRemaining / 60),
    };
  }

  @UseGuards(TazamaAuthGuard)
  @RequireClaims(TazamaClaims.VIEW_PROFILE)
  @Post('logout')
  @HttpCode(200)
  logout(@User() user: any) {
    const userId = user?.token?.clientId || user?.userId;
    const tenantId = user?.token?.tenantId || user?.tenantId;

    this.sessionManager.invalidateSession(userId, tenantId);

    this.logger.log(`User ${userId} logged out from tenant ${tenantId}`);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
