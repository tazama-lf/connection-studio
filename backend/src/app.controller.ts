import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/auth.decorator';

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
