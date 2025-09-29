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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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
  async getAuditLogs(@Query('limit') limit = 50, @Query('offset') offset = 0) {}
}
