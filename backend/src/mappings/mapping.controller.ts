import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MappingService } from './mapping.service';
import { CreateMappingDto, UpdateMappingDto } from './mapping.dto';
import { MappingStatus } from './mapping.entity';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireClaim, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
@Controller('mappings')
@UseGuards(TazamaAuthGuard)
export class MappingController {
  constructor(private readonly mappingService: MappingService) {}
  @Post()
  @RequireClaim(TazamaClaims.EDITOR)
  async createMapping(
    @Body() createMappingDto: CreateMappingDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.createMapping(
      createMappingDto,
      userIdentity,
    );
  }
  @Get()
  @RequireClaim(TazamaClaims.EDITOR)
  async findAll() {
    return await this.mappingService.findAll();
  }
  @Get(':id')
  @RequireClaim(TazamaClaims.EDITOR)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.mappingService.findOne(id);
  }
  @Get('name/:name')
  @RequireClaim(TazamaClaims.EDITOR)
  async findByName(@Param('name') name: string) {
    return await this.mappingService.findByName(name);
  }
  @Put(':id')
  @RequireClaim(TazamaClaims.EDITOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMappingDto: UpdateMappingDto,
    @User() _user: AuthenticatedUser,
  ) {
    return await this.mappingService.update(id, updateMappingDto);
  }
  @Delete(':id')
  @RequireClaim(TazamaClaims.EDITOR)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.mappingService.remove(id, userIdentity);
    return { message: 'Mapping deleted successfully' };
  }
  @Post('validate')
  @RequireClaim(TazamaClaims.EDITOR)
  async validateMapping(@Body() createMappingDto: CreateMappingDto) {
    const errors = await this.mappingService.validateMapping(createMappingDto);
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  @Get('history/:name')
  @RequireClaim(TazamaClaims.EDITOR)
  async getMappingHistory(@Param('name') name: string) {
    return await this.mappingService.getMappingHistory(name);
  }
  @Put(':id/status')
  @RequireClaim(TazamaClaims.APPROVER)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusData: { status: MappingStatus },
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.updateStatus(
      id,
      statusData.status,
      userIdentity,
    );
  }
  @Post(':id/approve')
  @RequireClaim(TazamaClaims.APPROVER)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.updateStatus(
      id,
      MappingStatus.READY_FOR_DEPLOYMENT,
      userIdentity,
    );
  }
  @Post(':id/publish')
  @RequireClaim(TazamaClaims.APPROVER)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.updateStatus(
      id,
      MappingStatus.PUBLISHED,
      userIdentity,
    );
  }
  @Post('simulate')
  @RequireClaim(TazamaClaims.EDITOR)
  async simulate(
    @Body() simulateDto: { mapping: CreateMappingDto; payload: any },
  ) {
    return await this.mappingService.simulate(
      simulateDto.mapping,
      simulateDto.payload,
    );
  }
  @Post(':id/rollback')
  @RequireClaim(TazamaClaims.APPROVER)
  async rollbackMapping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rollbackData: { targetVersion: number },
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.rollbackMapping(
      id,
      rollbackData.targetVersion,
      userIdentity,
    );
  }
  @Get(':id/audit-logs')
  @RequireClaim(TazamaClaims.EDITOR)
  async getMappingAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ) {
    return await this.mappingService.getMappingAuditLogs(id, limit, offset);
  }
  @Get(':id/export')
  @RequireClaim(TazamaClaims.EDITOR)
  async exportMappingConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.exportMappingConfig(id, userIdentity);
  }
  @Post('import')
  @RequireClaim(TazamaClaims.EDITOR)
  async importMappingConfig(
    @Body() configData: any,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    return await this.mappingService.importMappingConfig(
      configData,
      userIdentity,
    );
  }
}
