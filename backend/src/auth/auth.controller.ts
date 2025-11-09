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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly logger: LoggerService,
  ) {}
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { username: string; password: string }) {
    try {
      const result = await this.authService.login(body.username, body.password);

      this.logger.log('Login successful', AuthController.name);

      const response: any = {
        message: 'Login successful',
        token: result.token,
      };
      if (result.expiresIn) {
        response.expiresIn = result.expiresIn;
      }
      return response;
    } catch (error) {
      this.logger.warn(`Login failed: ${error.message}`, AuthController.name);
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
}
