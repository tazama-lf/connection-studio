import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SftpService } from './sftp.service';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { FetchSftpDto } from './dto/fetch-sftp.dto';
import { RequireClaims, TazamaClaims } from 'src/auth/auth.decorator';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { User } from 'src/auth/user.decorator';
import { type AuthenticatedUser } from 'src/auth/auth.types';

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
  async getFiles(@Query('format') format: 'de' | 'cron'| 'dems', @User() user: AuthenticatedUser) {
    const sftpHost = this.configService.get<string>('SFTP_HOST_PRODUCER');

    if (!sftpHost) {
      throw new BadRequestException(`Producer SFTP server credentials not provided.`);
    }

    return await this.sftpService.listFiles('/upload', format,user.tenantId);
  }

  @Get('/read')
  @RequireClaims(TazamaClaims.PUBLISHER)
  async viewFile(@Query('name') name: string) {
    return await this.sftpService.readFile(name)
  }
  @Post('/publish')
  @RequireClaims(TazamaClaims.PUBLISHER)
  async publishFile(@Query('name') name: string) {
    const sftpHost = this.configService.get<string>('SFTP_HOST_PRODUCER');
    if (!sftpHost) {
      throw new BadRequestException(`Producer SFTP server credentials not provided.`);
    }
    return await this.sftpService.publishFile(name);
  }

}
