import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { uuidPattern } from '../utils/constants';
import SFTPClient from 'ssh2-sftp-client';
import { SftpFile } from './types/sftp.interface';
import { createHash } from 'crypto';

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

    async onModuleInit(): Promise<void> {
        await this.connectConsumer();
        await this.connectProducer();
    }

    private async connectConsumer(): Promise<void> {
        const host = this.configService.get<string>('SFTP_HOST_CONSUMER');
        const port = this.configService.get<number>('SFTP_PORT_CONSUMER');
        const username = this.configService.get<string>('SFTP_USERNAME_CONSUMER');
        const password = this.configService.get<string>('SFTP_PASSWORD_CONSUMER');

    if (!host || !port || !username || !password) {
      this.loggerService.warn(
        'Consumer SFTP credentials not provided — skipping connection.',
      );
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

    private async connectProducer(): Promise<void> {
        const host = this.configService.get<string>('SFTP_HOST_PRODUCER');
        const port = this.configService.get<number>('SFTP_PORT_PRODUCER');
        const username = this.configService.get<string>('SFTP_USERNAME_PRODUCER');
        const password = this.configService.get<string>('SFTP_PASSWORD_PRODUCER');

    if (!host || !port || !username || !password) {
      this.loggerService.warn(
        'Producer SFTP credentials not provided — skipping connection.',
      );
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

    async onModuleDestroy(): Promise<void> {
        await Promise.allSettled([
            this.consumerSftp.end(),
            this.producerSftp.end(),
        ]);
        this.loggerService.log('SFTP connections closed.');
    }

  async createFile(fileName: string, data: unknown): Promise<void> {
    try {
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      const sftpHost = this.configService.get<string>('SFTP_HOST_CONSUMER');

      if (nodeEnv !== 'dev') {
        throw new BadRequestException(
          'Exported status can only be set in the dev environment.',
        );
      }

      if (!sftpHost) {
        throw new BadRequestException(
          'Consumer SFTP server credentials not provided.',
        );
      }

      const path = `/upload/${fileName}.json`;
      const integrityFilePath = `/upload/${fileName}.hash`;

      const buffer = Buffer.from(JSON.stringify(data, null, 2));
      await this.consumerSftp.put(buffer, path);

      const integrityValue = this.computeSHA256(buffer);

      await this.consumerSftp.put(
        Buffer.from(integrityValue, 'utf8'),
        integrityFilePath,
      );

      this.loggerService.log(`File uploaded ${fileName}`);
    } catch (error) {
      this.loggerService.error(
        `Failed to upload file ${fileName}: ${error.message}`,
      );
      throw error;
    }
  }

    async readFile(fileName: string): Promise<any> {
        try {

            const sftpHost = this.configService.get<string>('SFTP_HOST_PRODUCER');
            if (!sftpHost) {
                throw new BadRequestException(`Producer SFTP server credentials not provided.`);
            }

      const path = `/upload/${fileName}.json`;
      const integrityFilePath = `/upload/${fileName}.hash`;

      const [fileExists, integrityFile] = await Promise.all([
        this.producerSftp.exists(path),
        this.producerSftp.exists(integrityFilePath),
      ]);

      if (!fileExists || !integrityFile) {
        this.loggerService.warn('File or its integrity file not found');
        throw new NotFoundException('File or its integrity file not found');
      }

      const [fileBuffer, integrityBuffer] = await Promise.all([
        this.producerSftp.get(path),
        this.producerSftp.get(integrityFilePath),
      ]);

      const expectedValue = integrityBuffer.toString().trim();
      const computedValue = this.computeSHA256(fileBuffer);

      if (computedValue !== expectedValue) {
        this.loggerService.error(`Integrity check failed for ${fileName}`);
        throw new BadRequestException(
          `Integrity validation failed for ${fileName}`,
        );
      }

      const rawData = fileBuffer.toString('utf8').trim();
      return JSON.parse(rawData);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : JSON.stringify(error);

      this.loggerService.error(`Failed to read file ${fileName}: ${message}`);
      throw new InternalServerErrorException(
        `Unable to read file at ${fileName}`,
      );
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const sftpHost = this.configService.get<string>('SFTP_HOST_PRODUCER');
      if (!sftpHost) {
        throw new BadRequestException(
          'Producer SFTP server credentials not provided.',
        );
      }

      const path = `/upload/${fileName}.json`;
      const integrityFilePath = `/upload/${fileName}.hash`;

      const [fileExists, hashExists] = await Promise.all([
        this.producerSftp.exists(path),
        this.producerSftp.exists(integrityFilePath),
      ]);

      if (!fileExists && !hashExists) {
        this.loggerService.warn(`No files found for ${fileName}`);
        throw new NotFoundException(
          `File or its integrity file not found for ${fileName}`,
        );
      }

      if (fileExists) this.producerSftp.delete(path);
      if (hashExists) this.producerSftp.delete(integrityFilePath);

      this.loggerService.log('File(s) deleted.');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);

      this.loggerService.error(`Failed to delete file ${fileName}: ${message}`);
      throw error;
    }
  }

    async listFiles(remoteDir: string, format: 'de' | 'cron'): Promise<SftpFile[]> {
        try {
            const regex = /\.json$/i;

            const files: SftpFile[] = await this.producerSftp.list('/upload', (file: SftpFile) => regex.test(file.name));
            this.loggerService.log(`Found ${files.length} matching config files in ${remoteDir}`);
            return files;
        } catch (error: unknown) {

            const message =
                error instanceof Error ? error.message : JSON.stringify(error);

      this.loggerService.error(
        `Failed to list files in ${remoteDir}: ${message}`,
      );
      throw error;
    }
  }

  private computeSHA256(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
