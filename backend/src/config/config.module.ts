import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { TazamaDataModelModule } from '../tazama-data-model/tazama-data-model.module';
import { PayloadParsingService } from '../services/payload-parsing.service';
import { FileParsingService } from '../services/file-parsing.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpModule } from '../sftp/sftp.module';
import { NotificationModule } from '../notification/notification.module';
import { NotifyModule } from '../notify/notify.module';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { DatabaseService } from '@tazama-lf/tcs-lib';

@Module({
  imports: [
    
    HttpModule,
   
    SchemasModule,
   
    AuditModule,
   
    TazamaDataModelModule,
    SftpModule,
    NotificationModule,
    NotifyModule,
  ],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    PayloadParsingService,
    FileParsingService,
    AdminServiceClient,
    {
      provide: DatabaseService,
      useFactory: (nestConfigService: NestConfigService) => {
        const dbConfig = {
          host: nestConfigService.get<string>('DB_HOST') || 'localhost',
          port: nestConfigService.get<number>('DB_PORT') || 5432,
          database: nestConfigService.get<string>('DB_NAME') || 'postgres',
          user: nestConfigService.get<string>('DB_USER') || 'postgres',
          password: nestConfigService.get<string>('DB_PASS') || 'newpassword',
        };
        return new DatabaseService(dbConfig);
      },
      inject: [NestConfigService],
    },
  ],
  exports: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    PayloadParsingService,
    FileParsingService,
    AdminServiceClient,
  ],
})
export class ConfigModule {}
