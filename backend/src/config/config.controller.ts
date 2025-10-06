import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from './config.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  type CreateConfigDto,
  type UpdateConfigDto,
  type AddMappingDto,
  type ConfigResponseDto,
  type Config,
  ContentType,
  type TransactionType,
} from '../common/config.interfaces';
import { RequireClaims, TazamaClaims } from '../auth/auth.decorator';
import { FileParsingService } from '../common/file-parsing.service';

function getTenantId(user: AuthenticatedUser): string {
  return user.token.tenantId || 'default';
}

function decodeTokenString(tokenString: string): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return jwt.decode(tokenString);
  } catch {
    return null;
  }
}

function getUserId(user: AuthenticatedUser): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const decodedToken = decodeTokenString(user.token.tokenString);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return decodedToken.preferred_username;
}

@Controller('config')
@UseGuards(TazamaAuthGuard)
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly fileParsingService: FileParsingService,
  ) {}

  private autoDetectContentType(
    filename: string,
    content: string,
  ): ContentType {
    const lowercaseFilename = filename.toLowerCase();

    if (lowercaseFilename.endsWith('.json')) {
      return ContentType.JSON;
    }
    if (lowercaseFilename.endsWith('.xml')) {
      return ContentType.XML;
    }

    try {
      JSON.parse(content.trim());
      return ContentType.JSON;
    } catch {
      return ContentType.XML;
    }
  }

  @Post('upload')
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async createConfigFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('msgFam') msgFam: string,
    @Body('transactionType') transactionType: string,
    @Body('version') version: string,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!file) {
      throw new Error('No file uploaded');
    }

    const content = file.buffer.toString('utf8');
    const autoDetectedContentType = this.autoDetectContentType(
      file.originalname,
      content,
    );

    const dto: CreateConfigDto = {
      msgFam,
      transactionType,
      version,
      payload: content,
      contentType: autoDetectedContentType,
    };

    return this.configService.createConfig(
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Post()
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  async createConfig(
    @Body() dto: CreateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.createConfig(
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Get(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigById(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<Config> {
    const config = await this.configService.getConfigById(
      id,
      getTenantId(user),
    );
    if (!config) {
      throw new Error(`Config with ID ${id} not found`);
    }
    return config;
  }

  @Get()
  @RequireClaims(TazamaClaims.EDITOR)
  async getAllConfigs(@User() user: AuthenticatedUser): Promise<Config[]> {
    return this.configService.getAllConfigs(getTenantId(user));
  }

  @Get('transaction/:type')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigsByTransactionType(
    @Param('type') type: TransactionType,
    @User() user: AuthenticatedUser,
  ): Promise<Config[]> {
    return this.configService.getConfigsByTransactionType(
      type,
      getTenantId(user),
    );
  }

  @Get('endpoint')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigByEndpoint(
    @Query('path') path: string,
    @Query('version') version: string,
    @User() user: AuthenticatedUser,
  ): Promise<Config> {
    const config = await this.configService.getConfigByEndpoint(
      path,
      version || 'v1',
      getTenantId(user),
    );
    if (!config) {
      throw new Error(`Config not found for path ${path} version ${version}`);
    }
    return config;
  }

  @Put(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.updateConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Delete(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<void> {
    await this.configService.deleteConfig(
      id,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Post(':id/mapping')
  @RequireClaims(TazamaClaims.EDITOR)
  async addMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMappingDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.addMapping(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Delete(':id/mapping/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeMapping(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.removeMapping(
      id,
      index,
      getTenantId(user),
      getUserId(user),
    );
  }
}
