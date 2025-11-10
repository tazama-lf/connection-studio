import './jest.setup'; // Load environment variables first
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { PayloadParsingService } from '../services/payload-parsing.service';
import { FileParsingService } from '../services/file-parsing.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { SchemaInferenceService } from '../schemas/schema-inference.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { AuditService } from '../audit/audit.service';
import { SftpService } from '../sftp/sftp.service';
import { ConfigService as NestConfigService } from '@nestjs/config';

describe('ConfigModule', () => {
  let controller: ConfigController;
  let service: ConfigService;
  let repository: ConfigRepository;
  let workflowService: ConfigWorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        ConfigService,
        ConfigRepository,
        ConfigWorkflowService,
        {
          provide: PayloadParsingService,
          useValue: {
            parsePayloadToSchema: jest.fn(),
          },
        },
        {
          provide: FileParsingService,
          useValue: {
            parseFile: jest.fn(),
          },
        },
        {
          provide: AdminServiceClient,
          useValue: {
            forwardRequest: jest.fn(),
            getConfigById: jest.fn(),
            getAllConfigs: jest.fn(),
            writeConfig: jest.fn(),
          },
        },
        {
          provide: JSONSchemaConverterService,
          useValue: {
            convertToJSONSchema: jest.fn(),
            convertFromJSONSchema: jest.fn(),
          },
        },
        {
          provide: SchemaInferenceService,
          useValue: {
            inferSchemaFromPayload: jest.fn(),
          },
        },
        {
          provide: TazamaDataModelService,
          useValue: {
            isValidDestinationPath: jest.fn().mockReturnValue(true),
            getFieldType: jest.fn().mockReturnValue('string'),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
        {
          provide: SftpService,
          useValue: {
            createFile: jest.fn(),
            readFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: NestConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            getClient: jest.fn(),
            close: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
    service = module.get<ConfigService>(ConfigService);
    repository = module.get<ConfigRepository>(ConfigRepository);
    workflowService = module.get<ConfigWorkflowService>(ConfigWorkflowService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(workflowService).toBeDefined();
  });

  it('should have ConfigController', () => {
    expect(controller).toBeInstanceOf(ConfigController);
  });

  it('should have ConfigService', () => {
    expect(service).toBeInstanceOf(ConfigService);
  });

  it('should have ConfigRepository', () => {
    expect(repository).toBeInstanceOf(ConfigRepository);
  });

  it('should have ConfigWorkflowService', () => {
    expect(workflowService).toBeInstanceOf(ConfigWorkflowService);
  });
});
