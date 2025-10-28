import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SftpService } from './sftp.service';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { FetchSftpDto } from './dto/fetch-sftp.dto';

@Controller('sftp')
export class SftpController {

    constructor(private readonly sftpService: SftpService, private readonly configService: ConfigService) { }

    @Get('/all')
    async getFiles(@Query('format') format: 'de' | 'cron') {
        const sftpHost = this.configService.get<string>('SFTP_HOST_PRODUCER');

        if (!sftpHost) {
            throw new BadRequestException(`Producer SFTP server credentials not provided.`);
        }

        return await this.sftpService.listFiles('/upload', format)
    }

    @Get('/read')
    async viewFile(@Query('name') name: string) {
        return await this.sftpService.readFile(name)
    }
}
