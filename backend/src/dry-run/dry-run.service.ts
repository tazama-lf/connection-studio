import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { CreatePullJobDto } from '../job/dto/create-pull-job.dto';
import { FileSettings, HTTPConnection, SFTPConnection } from '../job/types/interface';
import { AuthType, FileType, SourceType } from '../utils/interfaces';
import { firstValueFrom } from 'rxjs';
import SFTPClient from 'ssh2-sftp-client';
import * as iconv from 'iconv-lite';
import { isValidText } from '../utils/helpers';
import { parse } from 'csv-parse/sync';

@Injectable()
export class DryRunService {

    constructor(
        private readonly loggerService: LoggerService,
        private readonly httpService: HttpService
    ) { }

    async transformFileToJSON(sftp: SFTPClient, file: FileSettings): Promise<any> {
        try {
            const buffer = await sftp.get(file.path);

            let decoded = '';
            try {
                decoded = iconv.decode(buffer, 'utf8');
                if (!isValidText(decoded)) {
                    throw new Error('Invalid text after decoding');
                }
            } catch (decodeError) {
                this.loggerService.warn(`Decoding failed : ${decodeError}`);
            }

            if (!decoded) {
                throw new Error(`Failed to decode file: ${file.path}`);
            }

            if (file.file_type === FileType.JSON) {
                const parsed = JSON.parse(decoded);
                return Array.isArray(parsed) ? parsed : [parsed];
            }

            if (file.file_type === FileType.CSV || file.file_type === FileType.TSV) {
                const records = parse(decoded, {
                    delimiter: file.file_type === FileType.CSV ? (file.delimiter ?? ',') : '\t',
                    columns: (headers: string[]) =>
                        headers.map((h) =>
                            h
                                .trim()
                                .toLowerCase()
                                .replace(/\s+/g, '_')
                                .replace(/[^\w_]/g, ''),
                        ),
                    skip_empty_lines: true,
                    trim: true,
                    relax_quotes: true,
                    quote: '"',
                    relax_column_count: true,
                    escape: '"',
                    record_delimiter: ['\r\n', '\n', '\r'],
                });
                return records;
            }

            throw new Error('Unsupported file type');
        } catch (error) {
            this.loggerService.error('Error transforming file:', error);
            throw error;
        }
    }


    private async dryRunHttpJob(job: CreatePullJobDto): Promise<void> {
        const httpCon = job.connection as HTTPConnection
        const { data } = await firstValueFrom(this.httpService.get(httpCon.url, { headers: httpCon.headers, timeout: 3000 }));

        const isValidType =
            (typeof data === 'object' && !Array.isArray(data)) || Array.isArray(data);

        if (!isValidType) {
            throw new Error(
                `Invalid data type received from HTTP source: expected object or array, got ${typeof data}`,
            );
        }

        if (Array.isArray(data) && data.length === 0) {
            this.loggerService.warn(`Empty array received from HTTP source: ${httpCon.url}`);
        }
    }

    async createSftpConnection(sftpCon: SFTPConnection): Promise<SFTPClient> {
        const sftp = new SFTPClient();
        try {
            if (sftpCon.auth_type === AuthType.USERNAME_PASSWORD) {
                await sftp.connect({
                    host: sftpCon.host,
                    port: sftpCon.port,
                    username: sftpCon.user_name,
                    password: sftpCon.password,
                });
            } else {
                await sftp.connect({
                    host: sftpCon.host,
                    port: sftpCon.port,
                    username: sftpCon.user_name,
                    privateKey: sftpCon.private_key,
                });
            }
            return sftp;
        } catch (err: any) {
            throw new Error(`SFTP connection failed: ${err.message}`);
        }
    }

    private async dryRunSftpJob(job: CreatePullJobDto): Promise<any> {
        const sftpCon = job.connection as SFTPConnection;
        const file = job.file;
        let sftp = new SFTPClient();

        try {
            sftp = await this.createSftpConnection(sftpCon);

            if (!file?.path) throw new Error('File path not provided in job config');
            const fileExists = await sftp.exists(file.path);
            if (!fileExists) throw new Error(`File ${file.path} not found on SFTP server`);

            const records = await this.transformFileToJSON(sftp, file);

            if (!records) {
                this.loggerService.warn(`No data found in provided file with path :${file.path} `);
                throw new Error(`No data found in provided file with path :${file.path} `);
            }
        } finally {
            sftp.end();
        }
    }

    async dryRun(job: CreatePullJobDto): Promise<any> {
        try {
            if (job.source_type === SourceType.HTTP) {
                return await this.dryRunHttpJob(job);
            } else {
                return await this.dryRunSftpJob(job);
            }
        } catch (error: any) {
            this.loggerService.error(`Dry run failed, ${error.message}`);
            throw new Error(`Dry run failed, ${error.message}`);
        }
    }
}
