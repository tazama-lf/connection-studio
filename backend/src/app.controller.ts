import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireClaim, TazamaClaims } from './auth/auth.decorator';
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

  @Get('editor')
  @UseGuards(TazamaAuthGuard)
  @RequireClaim(TazamaClaims.EDITOR)
  getEditorHello(@User() user: AuthenticatedUser): string {
    return `Hello Editor! Welcome ${user.token.username} from tenant ${user.token.tenantId}`;
  }

  @Get('approver')
  @UseGuards(TazamaAuthGuard)
  @RequireClaim(TazamaClaims.APPROVER)
  getApproverHello(@User() user: AuthenticatedUser): string {
    return `Hello Approver! Welcome ${user.token.username} from tenant ${user.token.tenantId}`;
  }

  @Get('publisher')
  @UseGuards(TazamaAuthGuard)
  @RequireClaim(TazamaClaims.PUBLISHER)
  getPublisherHello(@User() user: AuthenticatedUser): string {
    return `Hello Publisher! Welcome ${user.token.username} from tenant ${user.token.tenantId}`;
  }

  @Get('api/test')
  apiTest() {
    return {
      success: true,
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      endpoints: {
        mappings: '/mappings',
        endpoints: '/endpoints',
        auth: '/auth/login',
      },
      cors: 'enabled',
      authentication: 'JWT Bearer token required for protected routes',
    };
  }
}
