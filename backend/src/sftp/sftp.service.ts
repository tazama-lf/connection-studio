import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { uuidPattern } from 'src/utils/constants';
import SFTPClient from 'ssh2-sftp-client';
import { SftpFile } from './types/sftp.interface';

@Injectable()
export class SftpService implements OnModuleInit, OnModuleDestroy {
    private consumerSftp: SFTPClient;
    private producerSftp: SFTPClient;

    constructor(
        private readonly loggerService: LoggerService,
        private readonly configService: ConfigService,
    ) {
        this.consumerSftp = new SFTPClient();
        this.producerSftp = new SFTPClient();
    }


    async onModuleInit() {
        await this.connectConsumer();
        await this.connectProducer();
    }

    private async connectConsumer() {
        const host = this.configService.get<string>('SFTP_HOST_CONSUMER');
        const port = this.configService.get<number>('SFTP_PORT_CONSUMER');
        const username = this.configService.get<string>('SFTP_USERNAME_CONSUMER');
        const password = this.configService.get<string>('SFTP_PASSWORD_CONSUMER');

        if (!host || !port || !username || !password) {
            this.loggerService.warn('Consumer SFTP credentials not provided — skipping connection.');
            return;
        }

        try {
            await this.consumerSftp.connect({ host, port, username, password });
            this.loggerService.log(`Connected to CONSUMER SFTP at ${host}:${port}`);
        } catch (err) {
            this.loggerService.error('Failed to connect to CONSUMER SFTP', err);
            throw err;
        }
    }

    private async connectProducer() {
        const host = this.configService.get<string>('SFTP_HOST_PRODUCER');
        const port = this.configService.get<number>('SFTP_PORT_PRODUCER');
        const username = this.configService.get<string>('SFTP_USERNAME_PRODUCER');
        const password = this.configService.get<string>('SFTP_PASSWORD_PRODUCER');

        if (!host || !port || !username || !password) {
            this.loggerService.warn('Producer SFTP credentials not provided — skipping connection.');
            return;
        }

        try {
            await this.producerSftp.connect({ host, port, username, password });
            this.loggerService.log(`Connected to PRODUCER SFTP at ${host}:${port}`);
        } catch (err) {
            this.loggerService.error('Failed to connect to PRODUCER SFTP', err);
            throw err;
        }
    }

    async onModuleDestroy() {
        await Promise.allSettled([
            this.consumerSftp.end(),
            this.producerSftp.end(),
        ]);
        this.loggerService.log('SFTP connections closed.');
    }

    async createFile(path: string, data: unknown): Promise<void> {
        try {

            const buffer = Buffer.from(JSON.stringify(data, null, 2));
            await this.producerSftp.put(buffer, path);

            this.loggerService.log(`File uploaded to ${path}`);
        } catch (error) {
            this.loggerService.error(`Failed to upload file to ${path}: ${error.message}`);
            throw error;
        }
    }

    async readFile(remotePath: string): Promise<Record<string, any>> {
        try {
            const fileExists = await this.producerSftp.exists(remotePath);

            if (!fileExists) {
                this.loggerService.warn(`File not found at path: ${remotePath}`);
                throw new NotFoundException(`File not found at path: ${remotePath}`);
            }

            const fileContent = await this.producerSftp.get(remotePath);
            const rawData = fileContent.toString();
            return JSON.parse(rawData);
        } catch (error: unknown) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            const message =
                error instanceof Error ? error.message : JSON.stringify(error);

            this.loggerService.error(`Failed to read file ${remotePath}: ${message}`);
            throw new InternalServerErrorException(
                `Unable to read file at ${remotePath}`,
            );
        }
    }

    async listFiles(remoteDir: string, format: 'de' | 'cron'): Promise<SftpFile[]> {
        try {
            const regex = new RegExp(
                `^([a-zA-Z0-9_-]+)_${format}_(\\d+)_(${uuidPattern})\\.json$`
            );
            const files: SftpFile[] = await this.consumerSftp.list('/upload', (file: SftpFile) => regex.test(file.name));
            this.loggerService.log(`Found ${files.length} matching config files in ${remoteDir}`);
            return files;
        } catch (error) {
            this.loggerService.error(`Failed to list files in ${remoteDir}: ${error.message}`);
            throw error;
        }
    }
}   
