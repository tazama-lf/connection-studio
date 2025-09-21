import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireClaim } from './auth/auth.decorator';
import { TazamaAuthGuard } from './auth/tazama-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('editor')
  @UseGuards(TazamaAuthGuard)
  @RequireClaim('editor')
  getEditorHello(): string {
    return 'Hello Editor!';
  }

  @Get('approver')
  @UseGuards(TazamaAuthGuard)
  @RequireClaim('approver')
  getApproverHello(): string {
    return 'Hello Approver!';
  }

  @Get('publisher')
  @UseGuards(TazamaAuthGuard)
  @RequireClaim('publisher')
  getPublisherHello(): string {
    return 'Hello Publisher!';
  }
}
