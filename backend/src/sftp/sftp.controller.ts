import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequireClaims, TazamaClaims } from 'src/auth/auth.decorator';
import type { AuthenticatedUser } from 'src/auth/auth.types';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { User } from 'src/auth/user.decorator';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { FetchSftpDto } from './dto/fetch-sftp.dto';
import { SftpService } from './sftp.service';
import { SftpFile } from './types/sftp.interface';
import { Job, Schedule } from '@tazama-lf/tcs-lib';

@Controller('sftp')
@UseGuards(TazamaAuthGuard)
export class SftpController {
  constructor(
    private readonly sftpService: SftpService,
    private readonly configService: ConfigService,
  ) { }

  @Get('/all')
  @Serialize(FetchSftpDto)
  @RequireClaims(TazamaClaims.PUBLISHER)
  async getFiles(
    @Query('format') format: 'de' | 'cron' | 'dems',
    @User() user: AuthenticatedUser,
  ): Promise<SftpFile[]> {
    const sftpHost = this.configService.get<string>('SFTP_HOST_PRODUCER');

    if (!sftpHost) {
      throw new BadRequestException(
        'Producer SFTP server credentials not provided.',
      );
    }

    return await this.sftpService.listFiles('/upload', format, user.tenantId);
  }

  @Get('/read')
  @RequireClaims(TazamaClaims.PUBLISHER)
  async viewFile(@Query('name') name: string): Promise<Schedule | Job> {
    return await this.sftpService.readFile(name);
  }
}
