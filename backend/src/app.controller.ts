import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireClaim, TazamaClaims, Public } from './auth/auth.decorator';
import { TazamaAuthGuard } from './auth/tazama-auth.guard';
import { User } from './auth/user.decorator';
import type { AuthenticatedUser } from './auth/auth.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'up',
      service: 'connection-studio',
      timestamp: new Date().toISOString(),
    };
  }
}
