import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FlowableService } from './flowable.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StartProcessDto } from './dto/start-process.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

function getTenantId(user: AuthenticatedUser): string {
  return user.token.tenantId || 'default';
}

@Controller('flowable')
@UseGuards(TazamaAuthGuard)
export class FlowableController {
  private readonly logger = new Logger(FlowableController.name);

  constructor(private readonly flowableService: FlowableService) {}

  @Post('start')
  async startProcess(
    @Body() dto: StartProcessDto,
    @User() user: AuthenticatedUser,
  ) {
    const tenantId = getTenantId(user);
    this.logger.log(`Starting process for tenant ${tenantId}`);
    return this.flowableService.startProcess({ ...dto, tenantId });
  }

  @Get('tasks/:role')
  async getTasksForRole(@Param('role') role: string) {
    this.logger.log(`Getting tasks for role: ${role}`);
    return this.flowableService.getTasksForRole(role);
  }

  @Post('tasks/complete')
  async completeTask(@Body() dto: CompleteTaskDto) {
    this.logger.log(`Completing task: ${dto.taskId}`);
    return this.flowableService.completeTask(dto);
  }

  @Get('process/:processInstanceId')
  async getProcessInstance(
    @Param('processInstanceId') processInstanceId: string,
  ) {
    this.logger.log(`Getting process instance: ${processInstanceId}`);
    return this.flowableService.getProcessInstanceById(processInstanceId);
  }

  @Get('process/:processInstanceId/config')
  async getConfigFromProcess(
    @Param('processInstanceId') processInstanceId: string,
  ) {
    this.logger.log(
      `Getting config from process instance: ${processInstanceId}`,
    );
    return this.flowableService.getConfigFromProcess(processInstanceId);
  }

  @Get('processes')
  async getActiveProcesses(@User() user: AuthenticatedUser) {
    const tenantId = getTenantId(user);
    this.logger.log(`Getting active processes for tenant: ${tenantId}`);
    return this.flowableService.getActiveProcesses(tenantId);
  }

  @Get('tasks/user/:userId')
  async getTasksForUser(@Param('userId') userId: string) {
    this.logger.log(`Getting tasks for user: ${userId}`);
    return this.flowableService.getTasksForUser(userId);
  }
}
