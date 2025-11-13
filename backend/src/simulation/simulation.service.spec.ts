import { Test, TestingModule } from '@nestjs/testing';import { Test, TestingModule } from '@nestjs/testing';import { Test, TestingModule } from '@nestjs/testing';

import { SimulationService } from './simulation.service';

import { AdminServiceClient } from '../services/admin-service-client.service';import { SimulationService } from './simulation.service';import { SimulationService } from './simulation.service';

import { AuditService } from '../audit/audit.service';

import { Config } from '../config/config.interfaces';import { AdminServiceClient } from '../services/admin-service-client.service';import { ConfigRepository } from '../config/config.repository';

import { ContentType } from '@tazama-lf/tcs-lib';

import { AuditService } from '../audit/audit.service';import { AuditService } from '../audit/audit.service';

// Mock dependencies

jest.mock('../services/admin-service-client.service');import { Config } from '../config/config.interfaces';import { AdminServiceClient } from '../services/admin-service-client.service';

jest.mock('../audit/audit.service');

jest.mock('@tazama-lf/tcs-lib', () => ({import { ContentType } from '@tazama-lf/tcs-lib';import { Config, ContentType, ConfigStatus } from '../config/config.interfaces';

  ...jest.requireActual('@tazama-lf/tcs-lib'),

  processMappings: jest.fn(),

}));

// Mock the dependenciesdescribe('SimulationService', () => {

describe('SimulationService', () => {

  let service: SimulationService;jest.mock('../services/admin-service-client.service');  let service: SimulationService;

  let adminServiceClient: jest.Mocked<AdminServiceClient>;

  let auditService: jest.Mocked<AuditService>;jest.mock('../audit/audit.service');  let configRepository: jest.Mocked<ConfigRepository>;



  const mockConfig: Config = {jest.mock('@tazama-lf/tcs-lib', () => ({  let adminServiceClient: jest.Mocked<AdminServiceClient>;

    id: 1,

    msgFam: 'pain',  ...jest.requireActual('@tazama-lf/tcs-lib'),

    transactionType: 'pacs.008',

    endpointPath: '/tenant-001/v1/pacs.008',  processMappings: jest.fn(),  const mockConfig: Config = {

    version: 'v1',

    contentType: ContentType.JSON,}));    id: 1,

    schema: {

      type: 'object',    msgFam: 'pain.001',

      properties: {

        FIToFICstmrCdtTrf: {describe('SimulationService', () => {    transactionType: 'Payments',

          type: 'object',

          properties: {  let service: SimulationService;    endpointPath: '/test-tenant/v1/pain.001/Payments',

            GrpHdr: {

              type: 'object',  let adminServiceClient: jest.Mocked<AdminServiceClient>;    version: 'v1',

              properties: {

                MsgId: { type: 'string' },  let auditService: jest.Mocked<AuditService>;    contentType: ContentType.JSON,

                CreDtTm: { type: 'string' },

              },    schema: {

              required: ['MsgId'],

            },  const mockConfig: Config = {      type: 'object',

            CdtTrfTxInf: {

              type: 'array',    id: 1,      properties: {

              items: {

                type: 'object',    msgFam: 'pain',        amount: { type: 'number' },

                properties: {

                  PmtId: {    transactionType: 'pacs.008',        currency: { type: 'string' },

                    type: 'object',

                    properties: {    endpointPath: '/tenant-001/v1/pacs.008',        // Simulate a manually added field that's in the schema but wasn't in original payload

                      EndToEndId: { type: 'string' },

                    },    version: 'v1',        customerReference: { type: 'string' },

                  },

                  Amt: {    contentType: ContentType.JSON,      },

                    type: 'object',

                    properties: {    schema: {      required: ['amount', 'currency'],

                      InstdAmt: {

                        type: 'object',      type: 'object',      additionalProperties: false,

                        properties: {

                          Ccy: { type: 'string' },      properties: {    },

                          value: { type: 'number' },

                        },        FIToFICstmrCdtTrf: {    mapping: [],

                      },

                    },          type: 'object',    functions: [],

                  },

                },          properties: {    status: ConfigStatus.APPROVED,

              },

            },            GrpHdr: {    tenantId: 'test-tenant',

          },

        },              type: 'object',    createdBy: 'user-123',

      },

      required: ['FIToFICstmrCdtTrf'],              properties: {  };

    },

    mapping: [                MsgId: { type: 'string' },

      {

        source: ['FIToFICstmrCdtTrf.GrpHdr.MsgId'],                CreDtTm: { type: 'string' },  beforeEach(async () => {

        destination: 'transactionDetails.messageId',

        transformation: 'NONE',              },    const mockConfigRepository = {

      },

      {              required: ['MsgId'],      findConfigById: jest.fn(),

        source: ['FIToFICstmrCdtTrf.CdtTrfTxInf[0].PmtId.EndToEndId'],

        destination: 'transactionDetails.endToEndId',            },    };

        transformation: 'NONE',

      },            CdtTrfTxInf: {

    ],

    status: 'DEPLOYED',              type: 'array',    const mockAuditService = {

    tenantId: 'tenant-001',

    createdBy: 'test-user',              items: {      logAction: jest.fn(),

    createdAt: new Date(),

    updatedAt: new Date(),                type: 'object',    };

  };

                properties: {

  const mockJSONPayload = {

    FIToFICstmrCdtTrf: {                  PmtId: {    const mockAdminServiceClient = {

      GrpHdr: {

        MsgId: 'MSG-12345',                    type: 'object',      forwardRequest: jest.fn(),

        CreDtTm: '2024-01-01T10:00:00Z',

      },                    properties: {      getConfigById: jest.fn().mockResolvedValue(mockConfig),

      CdtTrfTxInf: [

        {                      EndToEndId: { type: 'string' },    };

          PmtId: {

            EndToEndId: 'E2E-67890',                    },

          },

          Amt: {                  },    const module: TestingModule = await Test.createTestingModule({

            InstdAmt: {

              Ccy: 'USD',                  Amt: {      providers: [

              value: 1000.5,

            },                    type: 'object',        SimulationService,

          },

        },                    properties: {        {

      ],

    },                      InstdAmt: {          provide: AdminServiceClient,

  };

                        type: 'object',          useValue: mockAdminServiceClient,

  const mockXMLPayload = `<?xml version="1.0"?>

<FIToFICstmrCdtTrf>                        properties: {        },

  <GrpHdr>

    <MsgId>MSG-12345</MsgId>                          Ccy: { type: 'string' },        {

    <CreDtTm>2024-01-01T10:00:00Z</CreDtTm>

  </GrpHdr>                          value: { type: 'number' },          provide: ConfigRepository,

  <CdtTrfTxInf>

    <PmtId>                        },          useValue: mockConfigRepository,

      <EndToEndId>E2E-67890</EndToEndId>

    </PmtId>                      },        },

    <Amt>

      <InstdAmt Ccy="USD">1000.5</InstdAmt>                    },        {

    </Amt>

  </CdtTrfTxInf>                  },          provide: AuditService,

</FIToFICstmrCdtTrf>`;

                },          useValue: mockAuditService,

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({              },        },

      providers: [

        SimulationService,            },      ],

        {

          provide: AdminServiceClient,          },    }).compile();

          useValue: {

            getConfigById: jest.fn(),        },

          },

        },      },    service = module.get<SimulationService>(SimulationService);

        {

          provide: AuditService,      required: ['FIToFICstmrCdtTrf'],    configRepository = module.get(ConfigRepository);

          useValue: {

            logAction: jest.fn().mockResolvedValue(undefined),    },    adminServiceClient = module.get(AdminServiceClient);

          },

        },    mapping: [  });

      ],

    }).compile();      {



    service = module.get<SimulationService>(SimulationService);        source: ['FIToFICstmrCdtTrf.GrpHdr.MsgId'],  it('should be defined', () => {

    adminServiceClient = module.get(AdminServiceClient);

    auditService = module.get(AuditService);        destination: 'transactionDetails.messageId',    expect(service).toBeDefined();

  });

        transformation: 'NONE',  });

  afterEach(() => {

    jest.clearAllMocks();      },

  });

      {  describe('Schema Validation with Manually Added Fields', () => {

  describe('simulateMapping - Basic Functionality', () => {

    it('should successfully simulate a valid JSON payload with mappings', async () => {        source: ['FIToFICstmrCdtTrf.CdtTrfTxInf[0].PmtId.EndToEndId'],    it('should allow additional properties in payload for manually added schema fields', async () => {

      const dto = {

        endpointId: 1,        destination: 'transactionDetails.endToEndId',      configRepository.findConfigById.mockResolvedValue(mockConfig);

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,        transformation: 'NONE',

      };

      },      const simulateDto = {

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

    ],        endpointId: 1,

      const { processMappings } = require('@tazama-lf/tcs-lib');

      processMappings.mockReturnValue({    status: 'DEPLOYED',        payloadType: 'application/json' as const,

        endToEndId: 'E2E-67890',

        dataCache: {    tenantId: 'tenant-001',        payload: {

          transactionDetails: {

            messageId: 'MSG-12345',    createdBy: 'test-user',          amount: 100,

            endToEndId: 'E2E-67890',

          },    createdAt: new Date(),          currency: 'USD',

        },

      });    updatedAt: new Date(),          customerReference: 'REF-12345', // This field was manually added to schema



      const result = await service.simulateMapping(  };          extraField: 'should be allowed', // Additional field should be allowed now

        dto,

        'tenant-001',        },

        'test-user',

        'mock-token',  const mockJSONPayload = {      };

      );

    FIToFICstmrCdtTrf: {

      expect(result.status).toBe('PASSED');

      expect(result.stages).toHaveLength(5);      GrpHdr: {      const result = await service.simulateMapping(

      expect(result.stages[0].name).toBe('1. Load Configuration');

      expect(result.stages[0].status).toBe('PASSED');        MsgId: 'MSG-12345',        simulateDto,

      expect(result.stages[1].name).toBe('2. Parse Payload');

      expect(result.stages[1].status).toBe('PASSED');        CreDtTm: '2024-01-01T10:00:00Z',        'test-tenant',

      expect(result.stages[2].name).toBe('3. Validate Schema');

      expect(result.stages[2].status).toBe('PASSED');      },        'user-123',

      expect(result.stages[3].name).toBe('4. Validate Mappings');

      expect(result.stages[3].status).toBe('PASSED');      CdtTrfTxInf: [        'test-token',

      expect(result.stages[4].name).toBe('5. Execute TCS Mapping Functions');

      expect(result.stages[4].status).toBe('PASSED');        {      );

      expect(result.tcsResult).toBeTruthy();

      expect(result.summary.passedStages).toBe(5);          PmtId: {

      expect(result.summary.failedStages).toBe(0);

      expect(auditService.logAction).toHaveBeenCalledWith(            EndToEndId: 'E2E-67890',      // Check that the schema validation stage passes

        expect.objectContaining({

          action: 'TCS_SIMULATE_MAPPING',          },      const schemaStage = result.stages.find(

          status: 'SUCCESS',

        }),          Amt: {        (stage) => stage.name === '3. Validate Schema',

      );

    });            InstdAmt: {      );



    it('should successfully simulate a valid JSON payload without mappings', async () => {              Ccy: 'USD',      expect(schemaStage).toBeDefined();

      const configWithoutMappings = { ...mockConfig, mapping: [] };

      const dto = {              value: 1000.5,      expect(schemaStage?.status).toBe('PASSED');

        endpointId: 1,

        payloadType: 'application/json' as const,            },

        payload: mockJSONPayload,

      };          },      // Should not have additionalProperties errors



      adminServiceClient.getConfigById.mockResolvedValue(configWithoutMappings);        },      const additionalPropsErrors = result.errors.filter(



      const result = await service.simulateMapping(      ],        (error) =>

        dto,

        'tenant-001',    },          error.message?.includes('additional') ||

        'test-user',

        'mock-token',  };          error.message?.includes('not allowed'),

      );

      );

      expect(result.status).toBe('PASSED');

      expect(result.stages).toHaveLength(5);  const mockXMLPayload = `<?xml version="1.0"?>      expect(additionalPropsErrors).toHaveLength(0);

      expect(result.stages[3].status).toBe('SKIPPED');

      expect(result.stages[3].message).toContain('No mappings defined');<FIToFICstmrCdtTrf>    });

      expect(result.stages[4].status).toBe('SKIPPED');

      expect(result.tcsResult).toBeNull();  <GrpHdr>

      expect(result.transformedPayload.originalPayload).toEqual(mockJSONPayload);

    });    <MsgId>MSG-12345</MsgId>    it('should validate required fields are present', async () => {



    it('should successfully simulate a valid XML payload', async () => {    <CreDtTm>2024-01-01T10:00:00Z</CreDtTm>      configRepository.findConfigById.mockResolvedValue(mockConfig);

      const dto = {

        endpointId: 1,  </GrpHdr>

        payloadType: 'application/xml' as const,

        payload: mockXMLPayload,  <CdtTrfTxInf>      const simulateDto = {

      };

    <PmtId>        endpointId: 1,

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      <EndToEndId>E2E-67890</EndToEndId>        payloadType: 'application/json' as const,

      const { processMappings } = require('@tazama-lf/tcs-lib');

      processMappings.mockReturnValue({    </PmtId>        payload: {

        endToEndId: 'E2E-67890',

        dataCache: { transactionDetails: { messageId: 'MSG-12345' } },    <Amt>          // Missing required 'amount' and 'currency' fields

      });

      <InstdAmt Ccy="USD">1000.5</InstdAmt>          customerReference: 'REF-12345',

      const result = await service.simulateMapping(

        dto,    </Amt>          extraField: 'should be allowed',

        'tenant-001',

        'test-user',  </CdtTrfTxInf>        },

        'mock-token',

      );</FIToFICstmrCdtTrf>`;      };



      expect(result.status).toBe('PASSED');

      expect(result.stages[1].status).toBe('PASSED');

      expect(result.stages[1].details.payloadType).toBe('application/xml');  beforeEach(async () => {      const result = await service.simulateMapping(

    });

    const module: TestingModule = await Test.createTestingModule({        simulateDto,

    it('should fail when endpointId is invalid', async () => {

      const dto = {      providers: [        'test-tenant',

        endpointId: NaN,

        payloadType: 'application/json' as const,        SimulationService,        'user-123',

        payload: mockJSONPayload,

      };        {        'test-token',



      const result = await service.simulateMapping(          provide: AdminServiceClient,      );

        dto,

        'tenant-001',          useValue: {

        'test-user',

        'mock-token',            getConfigById: jest.fn(),      // Should still validate required fields

      );

          },      const schemaStage = result.stages.find(

      expect(result.status).toBe('FAILED');

      expect(result.errors).toHaveLength(1);        },        (stage) => stage.name === '3. Validate Schema',

      expect(result.errors[0].field).toBe('endpointId');

      expect(result.errors[0].message).toContain('Invalid endpoint ID');        {      );

      expect(result.stages[0].status).toBe('FAILED');

    });          provide: AuditService,      expect(schemaStage).toBeDefined();



    it('should fail when endpointId is null', async () => {          useValue: {      expect(schemaStage?.status).toBe('FAILED');

      const dto = {

        endpointId: null as any,            logAction: jest.fn().mockResolvedValue(undefined),

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,          },      // Should have required field errors

      };

        },      const requiredFieldErrors = result.errors.filter((error) =>

      const result = await service.simulateMapping(

        dto,      ],        error.message?.includes('required'),

        'tenant-001',

        'test-user',    }).compile();      );

        'mock-token',

      );      expect(requiredFieldErrors.length).toBeGreaterThan(0);



      expect(result.status).toBe('FAILED');    service = module.get<SimulationService>(SimulationService);    });

      expect(result.errors[0].field).toBe('endpointId');

    });    adminServiceClient = module.get(AdminServiceClient);  });

  });

    auditService = module.get(AuditService);

  describe('Stage 1: Load Configuration', () => {

    it('should fail when token is missing', async () => {  });  describe('Config Not Found', () => {

      const dto = {

        endpointId: 1,    it('should fail when config is not found', async () => {

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,  afterEach(() => {      adminServiceClient.getConfigById.mockResolvedValue(null);

      };

    jest.clearAllMocks();

      const result = await service.simulateMapping(

        dto,  });      const simulateDto = {

        'tenant-001',

        'test-user',        endpointId: 999,

        undefined,

      );  describe('simulateMapping - Basic Functionality', () => {        payloadType: 'application/json' as const,



      expect(result.status).toBe('FAILED');    it('should successfully simulate a valid JSON payload with mappings', async () => {        payload: { amount: 100 },

      expect(result.stages[0].name).toBe('1. Load Configuration');

      expect(result.stages[0].status).toBe('FAILED');      const dto = {      };

      expect(result.stages[0].errors![0].field).toBe('token');

      expect(result.stages[0].errors![0].message).toContain('Missing authentication token');        endpointId: 1,

    });

        payloadType: 'application/json' as const,      const result = await service.simulateMapping(

    it('should fail when config is not found', async () => {

      const dto = {        payload: mockJSONPayload,        simulateDto,

        endpointId: 999,

        payloadType: 'application/json' as const,      };        'test-tenant',

        payload: mockJSONPayload,

      };        'user-123',



      adminServiceClient.getConfigById.mockResolvedValue(null);      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);        'test-token',



      const result = await service.simulateMapping(      );

        dto,

        'tenant-001',      const { processMappings } = require('@tazama-lf/tcs-lib');

        'test-user',

        'mock-token',      processMappings.mockReturnValue({      expect(result.status).toBe('FAILED');

      );

        endToEndId: 'E2E-67890',      const configStage = result.stages.find(

      expect(result.status).toBe('FAILED');

      expect(result.stages[0].status).toBe('FAILED');        dataCache: {        (stage) => stage.name === '1. Load Configuration',

      expect(result.stages[0].errors![0].message).toContain('Configuration with ID 999 not found');

    });          transactionDetails: {      );



    it('should fail when admin service throws error', async () => {            messageId: 'MSG-12345',      expect(configStage?.status).toBe('FAILED');

      const dto = {

        endpointId: 1,            endToEndId: 'E2E-67890',      expect(configStage?.message).toContain('Configuration not found');

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,          },    });

      };

        },  });

      adminServiceClient.getConfigById.mockRejectedValue(new Error('Database connection failed'));

      });

      const result = await service.simulateMapping(

        dto,  describe('Transformation Preview', () => {

        'tenant-001',

        'test-user',      const result = await service.simulateMapping(    it('should show transformed values in simulation preview', async () => {

        'mock-token',

      );        dto,      const configWithTransformations: Config = {



      expect(result.status).toBe('FAILED');        'tenant-001',        ...mockConfig,

      expect(result.stages[0].status).toBe('FAILED');

      expect(result.stages[0].errors![0].message).toContain('Database connection failed');        'test-user',        mapping: [

    });

  });        'mock-token',          {



  describe('Stage 2: Parse Payload', () => {      );            source: ['firstName', 'lastName'],

    it('should fail when JSON payload is invalid', async () => {

      const dto = {            destination: 'fullName',

        endpointId: 1,

        payloadType: 'application/json' as const,      expect(result.status).toBe('PASSED');            transformation: 'CONCAT',

        payload: 'invalid json{',

      };      expect(result.stages).toHaveLength(5);            delimiter: ' ',



      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);      expect(result.stages[0].name).toBe('1. Load Configuration');          },



      const result = await service.simulateMapping(      expect(result.stages[0].status).toBe('PASSED');          {

        dto,

        'tenant-001',      expect(result.stages[1].name).toBe('2. Parse Payload');            source: ['price', 'quantity'],

        'test-user',

        'mock-token',      expect(result.stages[1].status).toBe('PASSED');            destination: 'totalAmount',

      );

      expect(result.stages[2].name).toBe('3. Validate Schema');            transformation: 'MATH',

      expect(result.status).toBe('FAILED');

      expect(result.stages[1].name).toBe('2. Parse Payload');      expect(result.stages[2].status).toBe('PASSED');            operator: 'MULTIPLY',

      expect(result.stages[1].status).toBe('FAILED');

      expect(result.stages[1].errors![0].field).toBe('payload');      expect(result.stages[3].name).toBe('4. Validate Mappings');          },

    });

      expect(result.stages[3].status).toBe('PASSED');          {

    it('should fail when XML payload is malformed', async () => {

      const dto = {      expect(result.stages[4].name).toBe('5. Execute TCS Mapping Functions');            source: ['amount'],

        endpointId: 1,

        payloadType: 'application/xml' as const,      expect(result.stages[4].status).toBe('PASSED');            destination: 'formattedAmount',

        payload: '<root><unclosed>',

      };      expect(result.tcsResult).toBeTruthy();            transformation: 'NONE',



      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);      expect(result.summary.passedStages).toBe(5);            prefix: '$',



      const result = await service.simulateMapping(      expect(result.summary.failedStages).toBe(0);          },

        dto,

        'tenant-001',      expect(auditService.logAction).toHaveBeenCalledWith(          {

        'test-user',

        'mock-token',        expect.objectContaining({            destination: 'category',

      );

          action: 'TCS_SIMULATE_MAPPING',            transformation: 'CONSTANT',

      expect(result.status).toBe('FAILED');

      expect(result.stages[1].status).toBe('FAILED');          status: 'SUCCESS',            constantValue: 'payment',

      expect(result.stages[1].errors![0].field).toBe('payload');

    });        }),          },



    it('should parse already-parsed JSON object', async () => {      );          {

      const dto = {

        endpointId: 1,    });            source: ['item1', 'item2', 'item3'],

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,            destination: 'itemsList',

      };

    it('should successfully simulate a valid JSON payload without mappings', async () => {            transformation: 'CONCAT',

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const configWithoutMappings = { ...mockConfig, mapping: [] };            delimiter: ', ',

      const { processMappings } = require('@tazama-lf/tcs-lib');

      processMappings.mockReturnValue({ endToEndId: 'E2E-67890', dataCache: {} });      const dto = {          },



      const result = await service.simulateMapping(        endpointId: 1,          {

        dto,

        'tenant-001',        payloadType: 'application/json' as const,            source: ['value1', 'value2'],

        'test-user',

        'mock-token',        payload: mockJSONPayload,            destination: 'sumTotal',

      );

      };            transformation: 'SUM',

      expect(result.status).toBe('PASSED');

      expect(result.stages[1].status).toBe('PASSED');          },

    });

  });      adminServiceClient.getConfigById.mockResolvedValue(configWithoutMappings);        ],



  describe('Stage 3: Validate Schema', () => {        schema: {

    it('should fail when payload does not match schema - missing required field', async () => {

      const invalidPayload = {      const result = await service.simulateMapping(          type: 'object',

        FIToFICstmrCdtTrf: {

          GrpHdr: {        dto,          properties: {

            CreDtTm: '2024-01-01T10:00:00Z',

          },        'tenant-001',            firstName: { type: 'string' },

        },

      };        'test-user',            lastName: { type: 'string' },



      const dto = {        'mock-token',            price: { type: 'number' },

        endpointId: 1,

        payloadType: 'application/json' as const,      );            quantity: { type: 'number' },

        payload: invalidPayload,

      };            amount: { type: 'number' },



      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);      expect(result.status).toBe('PASSED');            item1: { type: 'string' },



      const result = await service.simulateMapping(      expect(result.stages).toHaveLength(5);            item2: { type: 'string' },

        dto,

        'tenant-001',      expect(result.stages[3].status).toBe('SKIPPED');            item3: { type: 'string' },

        'test-user',

        'mock-token',      expect(result.stages[3].message).toContain('No mappings defined');            value1: { type: 'number' },

      );

      expect(result.stages[4].status).toBe('SKIPPED');            value2: { type: 'number' },

      expect(result.status).toBe('FAILED');

      expect(result.stages[2].name).toBe('3. Validate Schema');      expect(result.tcsResult).toBeNull();          },

      expect(result.stages[2].status).toBe('FAILED');

      expect(result.errors.length).toBeGreaterThan(0);      expect(result.transformedPayload.originalPayload).toEqual(mockJSONPayload);          required: [],

    });

    });          additionalProperties: false,

    it('should fail when payload has wrong type', async () => {

      const invalidPayload = {        },

        FIToFICstmrCdtTrf: {

          GrpHdr: {    it('should successfully simulate a valid XML payload', async () => {      };

            MsgId: 12345,

          },      const dto = {

        },

      };        endpointId: 1,      configRepository.findConfigById.mockResolvedValue(



      const dto = {        payloadType: 'application/xml' as const,        configWithTransformations,

        endpointId: 1,

        payloadType: 'application/json' as const,        payload: mockXMLPayload,      );

        payload: invalidPayload,

      };      };



      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);      const dto = {



      const result = await service.simulateMapping(      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);        endpointId: 1,

        dto,

        'tenant-001',        payloadType: 'application/json' as const,

        'test-user',

        'mock-token',      const { processMappings } = require('@tazama-lf/tcs-lib');        payload: {

      );

      processMappings.mockReturnValue({          firstName: 'John',

      expect(result.status).toBe('FAILED');

      expect(result.stages[2].status).toBe('FAILED');        endToEndId: 'E2E-67890',          lastName: 'Doe',

    });

        dataCache: { transactionDetails: { messageId: 'MSG-12345' } },          price: 10.5,

    it('should pass when payload matches schema exactly', async () => {

      const dto = {      });          quantity: 3,

        endpointId: 1,

        payloadType: 'application/json' as const,          amount: 100,

        payload: mockJSONPayload,

      };      const result = await service.simulateMapping(          item1: 'apple',



      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);        dto,          item2: 'banana',



      const { processMappings } = require('@tazama-lf/tcs-lib');        'tenant-001',          item3: 'orange',

      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

        'test-user',          value1: 25,

      const result = await service.simulateMapping(

        dto,        'mock-token',          value2: 15,

        'tenant-001',

        'test-user',      );        },

        'mock-token',

      );      };



      expect(result.status).toBe('PASSED');      expect(result.status).toBe('PASSED');

      expect(result.stages[2].status).toBe('PASSED');

    });      expect(result.stages[1].status).toBe('PASSED');      const result = await service.simulateMapping(

  });

      expect(result.stages[1].details.payloadType).toBe('application/xml');        dto,

  describe('Audit Logging', () => {

    it('should log successful simulation to audit service', async () => {    });        'test-tenant',

      const dto = {

        endpointId: 1,        'user-123',

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,    it('should fail when endpointId is invalid', async () => {        'test-token',

      };

      const dto = {      );

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

        endpointId: NaN,

      const { processMappings } = require('@tazama-lf/tcs-lib');

      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });        payloadType: 'application/json' as const,      expect(result.status).toBe('PASSED');



      await service.simulateMapping(        payload: mockJSONPayload,

        dto,

        'tenant-001',      };      // Check that transformedPayload contains mapping details

        'test-user',

        'mock-token',      expect(result.transformedPayload).toBeDefined();

      );

      const result = await service.simulateMapping(      expect(result.transformedPayload.mappings).toBeDefined();

      expect(auditService.logAction).toHaveBeenCalledWith(

        expect.objectContaining({        dto,

          entityType: 'SIMULATION',

          action: 'TCS_SIMULATE_MAPPING',        'tenant-001',      const mappingDetails = result.transformedPayload.mappings;

          actor: 'test-user',

          tenantId: 'tenant-001',        'test-user',

          status: 'SUCCESS',

          severity: 'LOW',        'mock-token',      // Check CONCAT transformation

        }),

      );      );      const concatMapping = mappingDetails?.find(

    });

        (detail) => detail.destination === 'fullName',

    it('should log failed simulation to audit service', async () => {

      const invalidPayload = { invalid: 'structure' };      expect(result.status).toBe('FAILED');      );

      const dto = {

        endpointId: 1,      expect(result.errors).toHaveLength(1);      expect(concatMapping?.resultValue).toBe('John Doe');

        payloadType: 'application/json' as const,

        payload: invalidPayload,      expect(result.errors[0].field).toBe('endpointId');      expect(concatMapping?.transformation).toBe('CONCAT');

      };

      expect(result.errors[0].message).toContain('Invalid endpoint ID');

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      expect(result.stages[0].status).toBe('FAILED');      // Check MATH transformation

      await service.simulateMapping(

        dto,    });      const mathMapping = mappingDetails?.find(

        'tenant-001',

        'test-user',        (detail) => detail.destination === 'totalAmount',

        'mock-token',

      );    it('should fail when endpointId is null', async () => {      );



      expect(auditService.logAction).toHaveBeenCalledWith(      const dto = {      expect(mathMapping?.resultValue).toBe(31.5); // 10.5 * 3

        expect.objectContaining({

          action: 'TCS_SIMULATE_MAPPING',        endpointId: null as any,      expect(mathMapping?.transformation).toBe('MATH');

          status: 'FAILURE',

          severity: 'MEDIUM',        payloadType: 'application/json' as const,

        }),

      );        payload: mockJSONPayload,      // Check prefix transformation

    });

      };      const prefixMapping = mappingDetails?.find(

    it('should use SYSTEM as actor when userId is not provided', async () => {

      const dto = {        (detail) => detail.destination === 'formattedAmount',

        endpointId: 1,

        payloadType: 'application/json' as const,      const result = await service.simulateMapping(      );

        payload: mockJSONPayload,

      };        dto,      expect(prefixMapping?.resultValue).toBe('$100');



      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);        'tenant-001',      expect(prefixMapping?.transformation).toBe('NONE');



      const { processMappings } = require('@tazama-lf/tcs-lib');        'test-user',

      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

        'mock-token',      // Check CONSTANT transformation

      await service.simulateMapping(

        dto,      );      const constantMapping = mappingDetails?.find(

        'tenant-001',

        undefined,        (detail) => detail.destination === 'category',

        'mock-token',

      );      expect(result.status).toBe('FAILED');      );



      expect(auditService.logAction).toHaveBeenCalledWith(      expect(result.errors[0].field).toBe('endpointId');      expect(constantMapping?.resultValue).toBe('payment');

        expect.objectContaining({

          actor: 'SYSTEM',    });      expect(constantMapping?.transformation).toBe('CONSTANT');

        }),

      );  });

    });

  });      // Check multi-value CONCAT



  describe('Error Handling', () => {  describe('Stage 1: Load Configuration', () => {      const itemsMapping = mappingDetails?.find(

    it('should handle system errors gracefully', async () => {

      const dto = {    it('should fail when token is missing', async () => {        (detail) => detail.destination === 'itemsList',

        endpointId: 1,

        payloadType: 'application/json' as const,      const dto = {      );

        payload: mockJSONPayload,

      };        endpointId: 1,      expect(itemsMapping?.resultValue).toBe('apple, banana, orange');



      adminServiceClient.getConfigById.mockImplementation(() => {        payloadType: 'application/json' as const,

        throw new Error('Unexpected system failure');

      });        payload: mockJSONPayload,      // Check SUM transformation



      const result = await service.simulateMapping(      };      const sumMapping = mappingDetails?.find(

        dto,

        'tenant-001',        (detail) => detail.destination === 'sumTotal',

        'test-user',

        'mock-token',      const result = await service.simulateMapping(      );

      );

        dto,      expect(sumMapping?.resultValue).toBe(40); // 25 + 15

      expect(result.status).toBe('FAILED');

      const systemErrorStage = result.stages.find(s => s.name === 'System Error');        'tenant-001',      expect(sumMapping?.transformation).toBe('SUM');

      expect(systemErrorStage).toBeDefined();

      expect(systemErrorStage!.status).toBe('FAILED');        'test-user',    });

    });

        undefined, // No token  });

    it('should create proper error summary when multiple stages fail', async () => {

      const dto = {      );});

        endpointId: NaN,

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,      expect(result.status).toBe('FAILED');

      };      expect(result.stages[0].name).toBe('1. Load Configuration');

      expect(result.stages[0].status).toBe('FAILED');

      const result = await service.simulateMapping(      expect(result.stages[0].errors![0].field).toBe('token');

        dto,      expect(result.stages[0].errors![0].message).toContain('Missing authentication token');

        'tenant-001',    });

        'test-user',

        'mock-token',    it('should fail when config is not found', async () => {

      );      const dto = {

        endpointId: 999,

      expect(result.status).toBe('FAILED');        payloadType: 'application/json' as const,

      expect(result.summary.failedStages).toBeGreaterThan(0);        payload: mockJSONPayload,

      expect(result.summary.passedStages).toBe(0);      };

    });

  });      adminServiceClient.getConfigById.mockResolvedValue(null);



  describe('Summary Generation', () => {      const result = await service.simulateMapping(

    it('should generate accurate summary for successful simulation', async () => {        dto,

      const dto = {        'tenant-001',

        endpointId: 1,        'test-user',

        payloadType: 'application/json' as const,        'mock-token',

        payload: mockJSONPayload,      );

      };

      expect(result.status).toBe('FAILED');

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);      expect(result.stages[0].status).toBe('FAILED');

      expect(result.stages[0].errors![0].message).toContain('Configuration with ID 999 not found');

      const { processMappings } = require('@tazama-lf/tcs-lib');    });

      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

    it('should fail when admin service throws error', async () => {

      const result = await service.simulateMapping(      const dto = {

        dto,        endpointId: 1,

        'tenant-001',        payloadType: 'application/json' as const,

        'test-user',        payload: mockJSONPayload,

        'mock-token',      };

      );

      adminServiceClient.getConfigById.mockRejectedValue(new Error('Database connection failed'));

      expect(result.summary.endpointId).toBe(1);

      expect(result.summary.tenantId).toBe('tenant-001');      const result = await service.simulateMapping(

      expect(result.summary.validatedBy).toBe('test-user');        dto,

      expect(result.summary.mappingsApplied).toBeGreaterThanOrEqual(0);        'tenant-001',

      expect(result.summary.totalStages).toBe(5);        'test-user',

      expect(result.summary.passedStages).toBe(5);        'mock-token',

      expect(result.summary.failedStages).toBe(0);      );

      expect(result.summary.timestamp).toBeDefined();

    });      expect(result.status).toBe('FAILED');

      expect(result.stages[0].status).toBe('FAILED');

    it('should generate accurate summary for failed simulation', async () => {      expect(result.stages[0].errors![0].message).toContain('Database connection failed');

      const dto = {    });

        endpointId: 999,  });

        payloadType: 'application/json' as const,

        payload: mockJSONPayload,  describe('Stage 2: Parse Payload', () => {

      };    it('should fail when JSON payload is invalid', async () => {

      const dto = {

      adminServiceClient.getConfigById.mockResolvedValue(null);        endpointId: 1,

        payloadType: 'application/json' as const,

      const result = await service.simulateMapping(        payload: 'invalid json{',

        dto,      };

        'tenant-001',

        'test-user',      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

        'mock-token',

      );      const result = await service.simulateMapping(

        dto,

      expect(result.summary.passedStages).toBe(0);        'tenant-001',

      expect(result.summary.failedStages).toBeGreaterThan(0);        'test-user',

      expect(result.summary.totalStages).toBeGreaterThan(0);        'mock-token',

    });      );

  });

      expect(result.status).toBe('FAILED');

  describe('Edge Cases', () => {      expect(result.stages[1].name).toBe('2. Parse Payload');

    it('should handle null payload', async () => {      expect(result.stages[1].status).toBe('FAILED');

      const dto = {      expect(result.stages[1].errors![0].field).toBe('payload');

        endpointId: 1,    });

        payloadType: 'application/json' as const,

        payload: null,    it('should fail when XML payload is malformed', async () => {

      };      const dto = {

        endpointId: 1,

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);        payloadType: 'application/xml' as const,

        payload: '<root><unclosed>',

      const result = await service.simulateMapping(      };

        dto,

        'tenant-001',      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

        'test-user',

        'mock-token',      const result = await service.simulateMapping(

      );        dto,

        'tenant-001',

      expect(result.status).toBe('FAILED');        'test-user',

      expect(result.stages[1].status).toBe('FAILED');        'mock-token',

    });      );



    it('should handle empty string payload', async () => {      expect(result.status).toBe('FAILED');

      const dto = {      expect(result.stages[1].status).toBe('FAILED');

        endpointId: 1,      expect(result.stages[1].errors![0].field).toBe('payload');

        payloadType: 'application/json' as const,    });

        payload: '',

      };    it('should parse already-parsed JSON object', async () => {

      const dto = {

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);        endpointId: 1,

        payloadType: 'application/json' as const,

      const result = await service.simulateMapping(        payload: mockJSONPayload, // Already an object

        dto,      };

        'tenant-001',

        'test-user',      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

        'mock-token',

      );      const { processMappings } = require('@tazama-lf/tcs-lib');

      processMappings.mockReturnValue({ endToEndId: 'E2E-67890', dataCache: {} });

      expect(result.status).toBe('FAILED');

      expect(result.stages[1].status).toBe('FAILED');      const result = await service.simulateMapping(

    });        dto,

        'tenant-001',

    it('should handle arrays with multiple items', async () => {        'test-user',

      const arrayPayload = {        'mock-token',

        FIToFICstmrCdtTrf: {      );

          GrpHdr: { MsgId: 'MSG-ARRAY', CreDtTm: '2024-01-01T10:00:00Z' },

          CdtTrfTxInf: [      expect(result.status).toBe('PASSED');

            { PmtId: { EndToEndId: 'E2E-1' }, Amt: { InstdAmt: { Ccy: 'USD', value: 100 } } },      expect(result.stages[1].status).toBe('PASSED');

            { PmtId: { EndToEndId: 'E2E-2' }, Amt: { InstdAmt: { Ccy: 'EUR', value: 200 } } },    });

            { PmtId: { EndToEndId: 'E2E-3' }, Amt: { InstdAmt: { Ccy: 'GBP', value: 300 } } },  });

          ],

        },  describe('Stage 3: Validate Schema', () => {

      };    it('should fail when payload does not match schema - missing required field', async () => {

      const invalidPayload = {

      const dto = {        FIToFICstmrCdtTrf: {

        endpointId: 1,          GrpHdr: {

        payloadType: 'application/json' as const,            // Missing required MsgId

        payload: arrayPayload,            CreDtTm: '2024-01-01T10:00:00Z',

      };          },

        },

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);      };



      const { processMappings } = require('@tazama-lf/tcs-lib');      const dto = {

      processMappings.mockReturnValue({ endToEndId: 'E2E-1', dataCache: {} });        endpointId: 1,

        payloadType: 'application/json' as const,

      const result = await service.simulateMapping(        payload: invalidPayload,

        dto,      };

        'tenant-001',

        'test-user',      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

        'mock-token',

      );      const result = await service.simulateMapping(

        dto,

      expect(result.status).toBe('PASSED');        'tenant-001',

    });        'test-user',

  });        'mock-token',

});      );


      expect(result.status).toBe('FAILED');
      expect(result.stages[2].name).toBe('3. Validate Schema');
      expect(result.stages[2].status).toBe('FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when payload has wrong type', async () => {
      const invalidPayload = {
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: 12345, // Should be string, not number
          },
        },
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: invalidPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.stages[2].status).toBe('FAILED');
    });

    it('should pass when payload matches schema exactly', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
      expect(result.stages[2].status).toBe('PASSED');
    });
  });

  describe('Stage 4: Validate Mappings', () => {
    it('should fail when source field does not exist in payload', async () => {
      const configWithInvalidMapping = {
        ...mockConfig,
        mapping: [
          {
            source: ['NonExistent.Field.Path'],
            destination: 'transactionDetails.test',
            transformation: 'NONE' as const,
          },
        ],
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(configWithInvalidMapping);

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.stages[3].name).toBe('4. Validate Mappings');
      expect(result.stages[3].status).toBe('FAILED');
      expect(result.stages[3].errors!.some(e => e.field.includes('NonExistent'))).toBe(true);
    });

    it('should pass when all source fields exist', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
      expect(result.stages[3].status).toBe('PASSED');
    });

    it('should handle CONCAT transformation validation', async () => {
      const configWithConcat = {
        ...mockConfig,
        mapping: [
          {
            source: ['FIToFICstmrCdtTrf.GrpHdr.MsgId', 'FIToFICstmrCdtTrf.GrpHdr.CreDtTm'],
            destination: 'transactionDetails.combined',
            transformation: 'CONCAT' as const,
            delimiter: '-',
          },
        ],
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(configWithConcat);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
      expect(result.stages[3].status).toBe('PASSED');
    });

    it('should handle array path validation', async () => {
      const configWithArrayPath = {
        ...mockConfig,
        mapping: [
          {
            source: ['FIToFICstmrCdtTrf.CdtTrfTxInf[0].Amt.InstdAmt.value'],
            destination: 'transactionDetails.amount',
            transformation: 'NONE' as const,
          },
        ],
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(configWithArrayPath);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
      expect(result.stages[3].status).toBe('PASSED');
    });
  });

  describe('Stage 5: Execute TCS Mapping Functions', () => {
    it('should execute TCS mappings successfully', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const mockTCSResult = {
        endToEndId: 'E2E-67890',
        dataCache: {
          transactionDetails: {
            messageId: 'MSG-12345',
            endToEndId: 'E2E-67890',
          },
        },
      };

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue(mockTCSResult);

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
      expect(result.stages[4].name).toBe('5. Execute TCS Mapping Functions');
      expect(result.stages[4].status).toBe('PASSED');
      expect(result.tcsResult).toEqual(mockTCSResult);
      expect(result.transformedPayload.dataCache).toEqual(mockTCSResult.dataCache);
      expect(processMappings).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: mockJSONPayload,
        }),
      );
    });

    it('should fail when TCS mapping throws error', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockImplementation(() => {
        throw new Error('TCS mapping failed');
      });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.stages[4].status).toBe('FAILED');
      expect(result.stages[4].errors![0].message).toContain('TCS mapping failed');
    });

    it('should include custom TCS mapping configuration when provided', async () => {
      const customTCSMapping = {
        payload: mockJSONPayload,
        schemaId: 'custom-schema',
        mappings: [
          {
            source: 'FIToFICstmrCdtTrf.GrpHdr.MsgId',
            destination: 'redis.messageId',
          },
        ],
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
        tcsMapping: customTCSMapping,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
      expect(processMappings).toHaveBeenCalledWith(customTCSMapping);
    });
  });

  describe('Error Handling', () => {
    it('should handle system errors gracefully', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      // Force a system error by making admin service throw unexpected error
      adminServiceClient.getConfigById.mockImplementation(() => {
        throw new Error('Unexpected system failure');
      });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      const systemErrorStage = result.stages.find(s => s.name === 'System Error');
      expect(systemErrorStage).toBeDefined();
      expect(systemErrorStage!.status).toBe('FAILED');
    });

    it('should create proper error summary when multiple stages fail', async () => {
      const dto = {
        endpointId: NaN, // Invalid endpoint ID
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.summary.failedStages).toBeGreaterThan(0);
      expect(result.summary.passedStages).toBe(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log successful simulation to audit service', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'SIMULATION',
          action: 'TCS_SIMULATE_MAPPING',
          actor: 'test-user',
          tenantId: 'tenant-001',
          status: 'SUCCESS',
          severity: 'LOW',
        }),
      );
    });

    it('should log failed simulation to audit service', async () => {
      const invalidPayload = { invalid: 'structure' };
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: invalidPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TCS_SIMULATE_MAPPING',
          status: 'FAILURE',
          severity: 'MEDIUM',
        }),
      );
    });

    it('should use SYSTEM as actor when userId is not provided', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      await service.simulateMapping(
        dto,
        'tenant-001',
        undefined, // No userId
        'mock-token',
      );

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'SYSTEM',
        }),
      );
    });
  });

  describe('Summary Generation', () => {
    it('should generate accurate summary for successful simulation', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.summary.endpointId).toBe(1);
      expect(result.summary.tenantId).toBe('tenant-001');
      expect(result.summary.validatedBy).toBe('test-user');
      expect(result.summary.mappingsApplied).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalStages).toBe(5);
      expect(result.summary.passedStages).toBe(5);
      expect(result.summary.failedStages).toBe(0);
      expect(result.summary.timestamp).toBeDefined();
    });

    it('should generate accurate summary for failed simulation', async () => {
      const dto = {
        endpointId: 999,
        payloadType: 'application/json' as const,
        payload: mockJSONPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(null);

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.summary.passedStages).toBe(0);
      expect(result.summary.failedStages).toBeGreaterThan(0);
      expect(result.summary.totalStages).toBeGreaterThan(0);
    });
  });

  describe('Complex Payload Scenarios', () => {
    it('should handle deeply nested JSON structures', async () => {
      const deepPayload = {
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: 'MSG-DEEP',
            CreDtTm: '2024-01-01T10:00:00Z',
          },
          CdtTrfTxInf: [
            {
              PmtId: { EndToEndId: 'E2E-DEEP' },
              Amt: {
                InstdAmt: {
                  Ccy: 'EUR',
                  value: 5000,
                },
              },
            },
          ],
        },
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: deepPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E-DEEP', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
    });

    it('should handle arrays with multiple items', async () => {
      const arrayPayload = {
        FIToFICstmrCdtTrf: {
          GrpHdr: { MsgId: 'MSG-ARRAY', CreDtTm: '2024-01-01T10:00:00Z' },
          CdtTrfTxInf: [
            { PmtId: { EndToEndId: 'E2E-1' }, Amt: { InstdAmt: { Ccy: 'USD', value: 100 } } },
            { PmtId: { EndToEndId: 'E2E-2' }, Amt: { InstdAmt: { Ccy: 'EUR', value: 200 } } },
            { PmtId: { EndToEndId: 'E2E-3' }, Amt: { InstdAmt: { Ccy: 'GBP', value: 300 } } },
          ],
        },
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: arrayPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E-1', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
    });

    it('should handle empty arrays', async () => {
      const emptyArrayPayload = {
        FIToFICstmrCdtTrf: {
          GrpHdr: { MsgId: 'MSG-EMPTY', CreDtTm: '2024-01-01T10:00:00Z' },
          CdtTrfTxInf: [],
        },
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: emptyArrayPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'EMPTY', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      // May pass or fail depending on schema validation - just ensure it doesn't crash
      expect(result.status).toBeDefined();
      expect(result.stages).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null payload', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: null,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.stages[1].status).toBe('FAILED');
    });

    it('should handle empty string payload', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: '',
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.stages[1].status).toBe('FAILED');
    });

    it('should handle payload with special characters', async () => {
      const specialPayload = {
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: 'MSG-<>&"\'',
            CreDtTm: '2024-01-01T10:00:00Z',
          },
          CdtTrfTxInf: [
            {
              PmtId: { EndToEndId: 'E2E-Special-@#$%' },
              Amt: { InstdAmt: { Ccy: 'USD', value: 1000 } },
            },
          ],
        },
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: specialPayload,
      };

      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockReturnValue({ endToEndId: 'E2E-Special', dataCache: {} });

      const result = await service.simulateMapping(
        dto,
        'tenant-001',
        'test-user',
        'mock-token',
      );

      expect(result.status).toBe('PASSED');
    });
  });
});
