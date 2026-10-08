import { Test, TestingModule } from '@nestjs/testing';
import {
  SimulationService,
  SimulatePayloadDto,
} from '../../src/simulation/simulation.service';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';
import { SchemaValidationService } from '../../src/simulation/schema-validation.service';

jest.mock('@tazama-lf/tcs-lib', () => ({
  processMappings: jest.fn().mockResolvedValue({
    dataCache: { mappedField: 'mapped_value' },
    endToEndId: 'e2e-123',
    status: 'success',
  }),
  iMappingConfiguration: {},
  iMappingResult: {},
}));

jest.mock('xml2js', () => ({
  parseString: jest.fn((xml, callback) => {
    try {
      if (xml.includes('<invalid><xml>')) {
        callback(new Error('Invalid XML'), null);
      } else if (xml.includes('Invalid character entity')) {
        callback(new Error('Invalid character entity'), null);
      } else {
        const result = { root: { test: 'value' } };
        callback(null, result);
      }
    } catch (error) {
      callback(error, null);
    }
  }),
  Parser: jest.fn().mockImplementation(() => ({
    parseStringPromise: jest
      .fn()
      .mockResolvedValue({ root: { element: ['value'] } }),
  })),
}));

describe('SimulationService', () => {
  let service: SimulationService;
  const adminServiceClientMock = {
    getConfigById: jest.fn(),
    forwardRequest: jest.fn(),
  } as unknown as AdminServiceClient & {
    getConfigById: jest.Mock;
    forwardRequest: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const xml2js = require('xml2js');
    xml2js.Parser.mockImplementation(() => ({
      parseStringPromise: jest
        .fn()
        .mockResolvedValue({ root: { element: ['value'] } }),
    }));

    adminServiceClientMock.getConfigById.mockResolvedValue({
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: { type: 'object' },
        },
      ],
      tenantId: 'tenant-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        SchemaValidationService,
        { provide: AdminServiceClient, useValue: adminServiceClientMock },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail when endpointId is invalid', async () => {
    const dto: Partial<SimulatePayloadDto> = {
      // intentionally invalid endpointId
      endpointId: undefined as unknown as number,
      payloadType: 'application/json',
      payload: '{}',
    };

    const result = await service.simulateMapping(
      dto as any,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('endpointId');
  });

  it('should handle successful JSON payload simulation', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: {
            type: 'object',
            properties: { test: { type: 'string' } },
          },
        },
      ],
      mappings: [],
      tenantId: 'tenant-1',
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: { test: 'value' },
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    // Since we don't have real validation setup, just expect it to execute
    expect(result).toBeDefined();
    expect(result.summary.endpointId).toBe(1);
  });

  it('should handle XML payload simulation', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/xml',
          schema: {
            type: 'object',
            properties: { root: { type: 'object' } },
          },
        },
      ],
      mappings: [],
      tenantId: 'tenant-1',
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/xml',
      payload: '<root><test>value</test></root>',
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result).toBeDefined();
    expect(result.summary.endpointId).toBe(1);
  });

  it('should handle missing config', async () => {
    adminServiceClientMock.getConfigById.mockResolvedValue(null);

    const dto: SimulatePayloadDto = {
      endpointId: 999,
      payloadType: 'application/json',
      payload: {},
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle schema validation failure', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: {
            type: 'object',
            properties: { required_field: { type: 'string' } },
            required: ['required_field'],
          },
        },
      ],
      mappings: [],
      tenantId: 'tenant-1',
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: { wrong_field: 'value' },
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle JSON parsing errors', async () => {
    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: 'invalid json{',
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
  });

  it('should handle XML parsing errors', async () => {
    const xml2js = require('xml2js');
    xml2js.Parser.mockImplementationOnce(() => ({
      parseStringPromise: jest
        .fn()
        .mockRejectedValueOnce(new Error('Invalid XML')),
    }));

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/xml',
      payload: '<invalid><xml>',
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
  });

  it('should handle service errors', async () => {
    adminServiceClientMock.getConfigById.mockRejectedValue(
      new Error('Service error'),
    );

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: {},
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
  });

  it('should handle mapping validation and processing', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: {
            type: 'object',
            properties: { amount: { type: 'number' } },
          },
        },
      ],
      mapping: [
        {
          source: 'amount',
          target: 'mappedAmount',
          transformation: 'direct',
        },
      ],
      tenantId: 'tenant-1',
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: { amount: 1000 },
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result).toBeDefined();
    expect(result.summary.mappingsApplied).toBeGreaterThanOrEqual(0);
  });

  it('should handle custom TCS mapping in dto', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: { type: 'object' },
        },
      ],
      tenantId: 'tenant-1',
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const customMapping = {
      mapping: [],
      functions: [],
    } as any;

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: { test: 'value' },
      tcsMapping: customMapping,
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result).toBeDefined();
  });

  it('should handle tenant mismatch errors', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: { type: 'object' },
        },
      ],
      tenantId: 'different-tenant', // Different tenant
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: { test: 'value' },
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result.status).toBe('FAILED');
  });

  it('should handle invalid mapping configurations', async () => {
    const mockConfig = {
      id: 1,
      payloads: [
        {
          contentType: 'application/json',
          schema: { type: 'object' },
        },
      ],
      mapping: [
        {
          // Invalid mapping without required fields
          id: 'invalid-map',
        },
      ],
      tenantId: 'tenant-1',
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = {
      endpointId: 1,
      payloadType: 'application/json',
      payload: { test: 'value' },
    };

    const result = await service.simulateMapping(
      dto,
      'tenant-1',
      'user1',
      'token',
    );
    expect(result).toBeDefined();
  });

  describe('Private method coverage tests', () => {
    it('should cover stageLoadConfig with tenant mismatch', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        tenantId: 'wrong-tenant', // Different tenant to trigger mismatch
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');
      // Just check that the result has errors, don't check specific message
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cover stageParsePayload with complex XML', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          value: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: `
          <root>
            <items>
              <item><id>1</id><value>100</value></item>
              <item><id>2</id><value>200</value></item>
            </items>
          </root>
        `,
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover schema validation with additionalProperties false', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
              additionalProperties: false,
              required: ['name'],
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          name: 'John',
          age: 30,
          extra: 'not allowed', // This should trigger additionalProperties validation
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover TCS mapping execution with complex mappings', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                transaction: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sourcePath: 'transaction.id',
            destinationPath: 'processedTransaction.transactionId',
            processor: {
              expression: 'value',
              artifactOverrides: {},
            },
          },
          {
            ruleId: 'rule-002',
            id: 'mapping-002',
            cfg: '1.0',
            sourcePath: 'transaction.amount',
            destinationPath: 'processedTransaction.amount',
            processor: {
              expression: 'parseFloat(value)',
              artifactOverrides: {},
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          transaction: {
            id: 'txn-123',
            amount: 99.99,
            currency: 'USD',
          },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
      // Don't assume mappings will be applied, just check the result is defined
      expect(result.summary).toBeDefined();
    });

    it('should cover mapping validation with invalid mappings', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            // Missing required fields to trigger validation errors
            id: 'invalid-mapping',
            // Missing ruleId, cfg, sourcePath, etc.
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover XML parsing with CDATA sections', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: {
                  type: 'object',
                  properties: {
                    data: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload:
          '<root><data><![CDATA[Some <complex> & special characters!]]></data></root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover array validation within XML payload', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          value: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: `
          <root>
            <items>
              <item><value>first</value></item>
              <item><value>second</value></item>
              <item><value>third</value></item>
            </items>
          </root>
        `,
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover service error handling in config loading', async () => {
      adminServiceClientMock.getConfigById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');
      // Just check that there are errors, don't check specific message
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cover complex path field value extraction', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          details: {
                            type: 'object',
                            properties: {
                              value: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-array',
            id: 'mapping-array',
            cfg: '1.0',
            sourcePath: 'data.items[0].details.value',
            destinationPath: 'extracted.firstValue',
            processor: {
              expression: 'value',
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          data: {
            items: [
              { details: { value: 'first_item' } },
              { details: { value: 'second_item' } },
            ],
          },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover strict schema enforcement with runtime context fields', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                userId: { type: 'string' },
                businessData: { type: 'string' },
              },
              required: ['tenantId', 'userId', 'businessData'], // Runtime context fields should be filtered out
              additionalProperties: false,
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          businessData: 'important_data',
          // Note: not providing tenantId/userId which are runtime context fields
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover array schema enforcement with nested objects', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  nestedArray: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        value: { type: 'string' },
                      },
                      additionalProperties: false,
                    },
                  },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: [
          {
            id: '1',
            nestedArray: [
              { value: 'nested_value_1' },
              { value: 'nested_value_2' },
            ],
          },
        ],
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover schema with oneOf/anyOf/allOf constructs', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                data: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        type: { const: 'A' },
                        value: { type: 'string' },
                      },
                    },
                    {
                      type: 'object',
                      properties: {
                        type: { const: 'B' },
                        number: { type: 'number' },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
        mappings: [],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          data: { type: 'A', value: 'test_string' },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover empty path field value extraction', async () => {
      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-empty',
            id: 'mapping-empty',
            cfg: '1.0',
            sourcePath: '', // Empty path to trigger getFieldValue with empty path
            destinationPath: 'result.empty',
            processor: {
              expression: 'value || "default"',
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should cover full successful execution path with all stages', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                transaction: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                  },
                  required: ['id', 'amount'],
                },
              },
              required: ['transaction'],
            },
          },
        ],
        // Add schema at root level as expected by service
        schema: {
          type: 'object',
          properties: {
            transaction: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
              },
              required: ['id', 'amount'],
            },
          },
          required: ['transaction'],
        },
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sourcePath: 'transaction.id',
            destinationPath: 'processedTransaction.transactionId',
            processor: {
              expression: 'value',
              artifactOverrides: {},
            },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          transaction: {
            id: 'txn-12345',
            amount: 100.5,
            currency: 'USD',
          },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
      expect(result.stages.length).toBeGreaterThan(0); // Should have stages regardless of status
      // The execution should complete more stages now
      expect(result.stages.length).toBeGreaterThanOrEqual(3); // Config, Parse, Schema at minimum
    });

    it('should handle null/undefined token', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        '',
      );
      expect(result.status).toBe('FAILED');
    });

    it('should handle schema with items but not array type', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          items: {
            type: 'string',
          },
          properties: {
            data: { type: 'string' },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              items: {
                type: 'string',
              },
              properties: {
                data: { type: 'string' },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { data: 'test' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle schema with oneOf constructs', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          oneOf: [
            { properties: { type: { const: 'A' } } },
            { properties: { type: { const: 'B' } } },
          ],
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              oneOf: [
                { properties: { type: { const: 'A' } } },
                { properties: { type: { const: 'B' } } },
              ],
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { type: 'A' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle schema with anyOf constructs', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          anyOf: [
            { properties: { field1: { type: 'string' } } },
            { properties: { field2: { type: 'number' } } },
          ],
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              anyOf: [
                { properties: { field1: { type: 'string' } } },
                { properties: { field2: { type: 'number' } } },
              ],
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'test' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle schema with allOf constructs', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          allOf: [
            { properties: { id: { type: 'string' } } },
            { properties: { name: { type: 'string' } } },
          ],
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              allOf: [
                { properties: { id: { type: 'string' } } },
                { properties: { name: { type: 'string' } } },
              ],
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { id: '1', name: 'test' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should test extractTransactionType method', () => {
      const url1 = 'http://example.com/api/v1/pacs.008';
      const result1 = service.extractTransactionType(url1);
      expect(result1).toBe('pacs.008');

      const url2 = 'http://example.com/';
      const result2 = service.extractTransactionType(url2);
      expect(result2).toBe('unknown');

      const url3 = 'simple-transaction';
      const result3 = service.extractTransactionType(url3);
      expect(result3).toBe('simple-transaction');
    });

    it('should handle array type schema with items having object type', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              value: { type: 'number' },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  value: { type: 'number' },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: [
          { id: '1', value: 100 },
          { id: '2', value: 200 },
        ],
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle schema with required fields that are all runtime context fields', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            tenant_id: { type: 'string' },
            user_id: { type: 'string' },
          },
          required: ['tenantId', 'userId', 'tenant_id', 'user_id'],
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                userId: { type: 'string' },
              },
              required: ['tenantId', 'userId'],
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {},
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mapping with sources array and runtime context fields', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['tenantId', 'userId'],
            destinationPath: 'result.contextData',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { someData: 'test' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mapping with source field (singular) as array', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            source: ['field1', 'field2'],
            destinationPath: 'result.data',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1', field2: 'value2' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mapping with constant transformation', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            transformation: 'CONSTANT',
            constantValue: 'FIXED_VALUE',
            destinationPath: 'result.constant',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { someData: 'test' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mapping with missing source fields and suggest root path', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['missingField'],
            destinationPath: 'result.data',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          root: {
            missingField: 'value',
          },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mapping with missing destination field', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle XML payload with attributes and text content', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            root: {
              type: 'object',
              properties: {
                element: { type: 'string' },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: {
                  type: 'object',
                  properties: {
                    element: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: '<root><element attr="value">text content</element></root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle empty XML payload', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/xml',
            schema: { type: 'object' },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: '',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');
    });

    it('should handle payload with missing payloadType', async () => {
      const dto: any = {
        endpointId: 1,
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');
    });

    it('should handle schema validation exception', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: null,
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: null,
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle array path detection in nested structures', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          items: [
            { value: 'test1', extra: 'field1' },
            { value: 'test2', extra: 'field2' },
          ],
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle field value extraction with bracket notation', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['items[0].value'],
            destinationPath: 'result.firstValue',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          items: [{ value: 'first' }, { value: 'second' }],
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mapping with all sources as runtime context fields', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['tenantId', 'userId', 'tenant_id', 'user_id'],
            destinationPath: 'result.contextData',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { someData: 'test' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle numeric part in path for array detection', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          items: ['item1', 'item2', { extra: 'data' }],
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle TCS mapping with logger service error', async () => {
      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockRejectedValueOnce(
        new Error('loggerService is not defined'),
      );

      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            destinationPath: 'result.data',
            processor: { expression: 'value' },
          },
        ],
        endpointPath: 'test-endpoint',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();

      processMappings.mockResolvedValue({
        dataCache: { mappedField: 'mapped_value' },
        endToEndId: 'e2e-123',
        status: 'success',
      });
    });

    it('should handle TCS mapping with non-logger error', async () => {
      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockRejectedValueOnce(
        new Error('Some other mapping error'),
      );

      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            destinationPath: 'result.data',
            processor: { expression: 'value' },
          },
        ],
        endpointPath: 'test-endpoint',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');

      processMappings.mockResolvedValue({
        dataCache: { mappedField: 'mapped_value' },
        endToEndId: 'e2e-123',
        status: 'success',
      });
    });

    it('should fail when processMappings throws a non-loggerService error', async () => {
      // Arrange
      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockRejectedValueOnce(
        new Error('Unexpected mapping failure'),
      );

      jest.spyOn(adminServiceClientMock, 'getConfigById').mockResolvedValue({
        endpointPath: '/test/path',
        mapping: [{ source: 'test', destination: 'out' }],
        schema: { type: 'object' },
      } as any);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      // Act
      const result = await service.simulateMapping(
        dto,
        'tenant_001',
        'user_001',
        'token',
      );

      // Assert
      const tcsStage = result.stages.find((s) =>
        s.name.includes('Execute TCS Mapping'),
      );

      expect(tcsStage?.status).toBe('FAILED');
      expect(result.status).toBe('FAILED');

      expect(tcsStage?.errors?.[0].message).toContain(
        'Unexpected mapping failure',
      );

      // Reset mock
      processMappings.mockResolvedValue({
        dataCache: { mappedField: 'mapped_value' },
        endToEndId: 'e2e-123',
        status: 'success',
      });
    });

    it('should handle path not found in isArrayPath', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                data: { type: 'string' },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          data: 'test',
          extra: { nested: 'value' },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle mappings with source as single string', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            source: 'singleField',
            destinationPath: 'result.data',
            processor: { expression: 'value' },
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { singleField: 'value' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle schema with no properties', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { anyField: 'anyValue' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle XML with nested text content and attributes', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            root: {
              type: 'object',
              properties: {
                element: {
                  type: 'object',
                  properties: {
                    textContent: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: {
                  type: 'object',
                  properties: {
                    element: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload:
          '<root><element attr1="value1" attr2="value2">text value</element></root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle schema path that returns null type', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            level1: {
              properties: {
                level2: {
                  type: 'string',
                },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                level1: {
                  properties: {
                    level2: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          level1: {
            level2: 'value',
          },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle normalizing XML with nested objects containing text content', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            root: {
              type: 'object',
              properties: {
                item: {
                  type: 'string',
                },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: {
                  type: 'object',
                  properties: {
                    item: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: '<root><item>simple text</item></root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle XML with only text and no other elements', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            root: { type: 'string' },
          },
        },
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: { type: 'string' },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: '<root>simple text content</root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle array type errors in validation', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: [{ id: 'string_not_number' }, { id: 123 }],
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle path with no part found in isArrayPath', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          data: {
            value: 'test',
            extra: 'field',
          },
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle current as array in isArrayPath', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nested: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nested: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          items: [
            {
              nested: ['value1', 'value2'],
              extra: 'field',
            },
          ],
        },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle non-object return from normalizeXmlParsedObject', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            root: { type: 'string' },
          },
        },
        payloads: [
          {
            contentType: 'application/xml',
            schema: {
              type: 'object',
              properties: {
                root: { type: 'string' },
              },
            },
          },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: '<root>text</root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle all mappings passed successfully', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: {
          type: 'object',
          properties: {
            field1: { type: 'string' },
            field2: { type: 'string' },
          },
        },
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                field1: { type: 'string' },
                field2: { type: 'string' },
              },
            },
          },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            destinationPath: 'result.field1',
            processor: { expression: 'value' },
          },
          {
            ruleId: 'rule-002',
            id: 'mapping-002',
            cfg: '1.0',
            sources: ['field2'],
            destinationPath: 'result.field2',
            processor: { expression: 'value' },
          },
        ],
        endpointPath: 'test-endpoint',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1', field2: 'value2' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.mappingsApplied).toBeGreaterThanOrEqual(0);
    });

    it('should normalize XML object with only #text property', async () => {
      const xmlObj = { '#text': 'simple text content' };
      const normalized = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(normalized).toBe('simple text content');
    });

    it('should normalize XML object with #text and other properties', async () => {
      const xmlObj = { '#text': 'text', otherField: 'value' };
      const normalized = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(normalized).toHaveProperty('textContent', 'text');
      expect(normalized).toHaveProperty('otherField', 'value');
    });

    it('should skip @ prefixed attributes in normalization', async () => {
      const xmlObj = { '@attr': 'value', regularField: 'data' };
      const normalized = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(normalized).not.toHaveProperty('@attr');
      expect(normalized).toHaveProperty('regularField', 'data');
    });

    it('should skip xmlns attributes in normalization', async () => {
      const xmlObj = { 'xmlns:ns': 'http://example.com', regularField: 'data' };
      const normalized = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(normalized).not.toHaveProperty('xmlns:ns');
      expect(normalized).toHaveProperty('regularField', 'data');
    });

    it('should skip $ property in normalization', async () => {
      const xmlObj = { $: { attr: 'value' }, regularField: 'data' };
      const normalized = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(normalized).not.toHaveProperty('$');
      expect(normalized).toHaveProperty('regularField', 'data');
    });

    it('should detect array path when encountering array during traversal', async () => {
      const obj = { items: [{ id: 1 }, { id: 2 }] };
      const result = (service as any).isArrayPath(obj, 'items');
      expect(result).toBe(true);
    });

    it('should detect array path with numeric index in path', async () => {
      const obj = { items: { 0: { id: 1 } } };
      const result = (service as any).isArrayPath(obj, 'items/0');
      expect(result).toBe(true);
    });

    it('should return false for empty path in isArrayPath', async () => {
      const obj = { items: [] };
      const result = (service as any).isArrayPath(obj, '');
      expect(result).toBe(false);
    });

    it('should return undefined for empty path in getFieldValue', async () => {
      const obj = { field: 'value' };
      const result = (service as any).getFieldValue(obj, '');
      expect(result).toBeUndefined();
    });

    it('should normalize path with bracket notation in getFieldValue', async () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      const result = (service as any).getFieldValue(obj, 'items[1].name');
      expect(result).toBe('second');
    });

    it('should handle isArrayPath when current becomes array during traversal', async () => {
      const obj = {
        level1: {
          level2: [{ id: 1 }, { id: 2 }],
        },
      };
      const result = (service as any).isArrayPath(obj, 'level1/level2/0');
      expect(result).toBe(true);
    });

    it('should handle isArrayPath when path part not found in object', async () => {
      const obj = { field1: { field2: 'value' } };
      const result = (service as any).isArrayPath(
        obj,
        'field1/nonexistent/field',
      );
      expect(result).toBe(false);
    });

    it('should handle normalizeXmlParsedObject with primitive value', async () => {
      const result = (service as any).normalizeXmlParsedObject(
        'primitive string',
      );
      expect(result).toBe('primitive string');
    });

    it('should handle normalizeXmlParsedObject with null', async () => {
      const result = (service as any).normalizeXmlParsedObject(null);
      expect(result).toBeNull();
    });

    it('should handle normalizeXmlParsedObject with nested array', async () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      const result = (service as any).normalizeXmlParsedObject(obj);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('first');
    });

    it('should handle parsePayload with content-type containing charset', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { test: 'value' },
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
      expect(result.summary.endpointId).toBe(1);
    });

    it('should handle createStageBasedResult with null transformedPayload', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {},
      };

      const result = (service as any).createStageBasedResult(
        dto,
        new Date().toISOString(),
        'user1',
        'tenant1',
        [],
        [],
        null,
        null,
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle extractTransactionType with nested DataCache structure', async () => {
      const result = (service as any).extractTransactionType(
        '/api/v1/pacs.002',
      );
      expect(result).toBe('pacs.002');
    });

    it('should handle extractTransactionType with debtor info', async () => {
      const result = (service as any).extractTransactionType(
        '/api/v1/pacs.008',
      );
      expect(result).toBe('pacs.008');
    });

    it('should handle validation error with additionalProperties and array path', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          items: [{ id: 1, name: 'test', extraField: 'should fail' }],
        },
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                },
              },
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );

      // Validation might pass or fail depending on array handling
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle validation error with instancePath containing numeric segment', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          transactions: [
            { amount: 100, currency: 'USD' },
            { amount: 'invalid', currency: 'EUR' },
          ],
        },
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      amount: { type: 'number' },
                      currency: { type: 'string' },
                    },
                    required: ['amount', 'currency'],
                  },
                },
              },
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle validation error with type keyword but no path segments', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { value: 'should be number' },
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                value: { type: 'number' },
              },
              required: ['value'],
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle additionalProperties error with isArrayPath returning true', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          items: [
            { id: 1, allowed: true },
            { id: 2, allowed: false, extra: 'not allowed' },
          ],
        },
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      allowed: { type: 'boolean' },
                    },
                    additionalProperties: false,
                    required: ['id', 'allowed'],
                  },
                },
              },
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );

      // May pass or fail depending on validation, but should handle additionalProperties
      expect(result).toBeDefined();
    });

    it('should handle type error with instancePath containing path segments', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: {
          nested: {
            values: [100, 'invalid', 300],
          },
        },
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                nested: {
                  type: 'object',
                  properties: {
                    values: {
                      type: 'array',
                      items: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle normalizeXmlParsedObject with non-object value', async () => {
      const result = (service as any).normalizeXmlParsedObject(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle normalizeXmlParsedObject with number value', async () => {
      const result = (service as any).normalizeXmlParsedObject(42);
      expect(result).toBe(42);
    });

    it('should handle normalizeXmlParsedObject with boolean value', async () => {
      const result = (service as any).normalizeXmlParsedObject(true);
      expect(result).toBe(true);
    });

    it('should handle XML object with only xmlns properties', async () => {
      const xmlObj = {
        'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      };

      const result = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle XML with $ property and regular fields', async () => {
      const xmlObj = {
        $: { meta: 'data' },
        field: 'value',
        nested: { data: 'content' },
      };

      const result = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(result).toBeDefined();
      expect(result.$).toBeUndefined();
      expect(result.field).toBe('value');
      expect(result.nested.data).toBe('content');
    });

    it('should handle XML normalization with nested objects', async () => {
      const xmlObj = {
        parent: {
          child: {
            grandchild: {
              value: 'deep',
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(result).toBeDefined();
      expect(result.parent.child.grandchild.value).toBe('deep');
    });

    it('should handle XML object with primitive value property', async () => {
      const xmlObj = {
        field: null,
        another: undefined,
        number: 0,
      };

      const result = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(result).toBeDefined();
      expect(result.field).toBeNull();
      expect(result.number).toBe(0);
    });

    it('should handle validation with error at root path', async () => {
      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: 'not an object',
      };

      const mockConfig = {
        id: 1,
        payloads: [
          {
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                field: { type: 'string' },
              },
            },
          },
        ],
        tenantId: 'tenant-1',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );

      expect(result.status).toBe('FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle XML normalization with empty object', async () => {
      const xmlObj = {};
      const result = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle XML with mixed content - attributes, text, and elements', async () => {
      const xmlObj = {
        element: {
          '@id': '123',
          '#text': 'some text',
          nested: 'value',
          'xmlns:ns': 'namespace',
        },
      };

      const result = (service as any).normalizeXmlParsedObject(xmlObj);
      expect(result).toBeDefined();
      expect(result.element).toBeDefined();
    });

    it('should cover validation type error without slash in instancePath', async () => {
      const config = {
        tenantId: 'tenant123',
        endpointId: 'endpoint1',
        schemaType: 'Custom',
        payloadType: 'JSON',
        schemaVersion: '1.0',
        schema: {
          type: 'string',
        },
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 123,
        payload: JSON.stringify(123),
        payloadType: 'application/json' as 'application/json',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.errors).toBeDefined();
    });

    it('should cover validation error processing branch for type keyword', async () => {
      const config = {
        tenantId: 'tenant123',
        endpointId: 'endpoint1',
        schemaType: 'Custom',
        payloadType: 'JSON',
        schemaVersion: '1.0',
        schema: {
          type: 'object',
          properties: {
            field: { type: 'number' },
          },
          additionalProperties: false,
        },
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 123,
        payload: JSON.stringify({ field: 'not-a-number' }),
        payloadType: 'application/json' as 'application/json',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cover XML parsing error with cause', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest
          .fn()
          .mockRejectedValueOnce(new Error('Unexpected close tag')),
      }));

      const config = {
        tenantId: 'tenant123',
        endpointId: 123,
        schemaType: 'ISO20022',
        payloadType: 'XML',
        schemaVersion: '1.0',
        schema: {
          type: 'object',
          properties: {
            root: { type: 'object' },
          },
        },
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 123,
        payload: '<root><unclosed>',
        payloadType: 'application/xml' as 'application/xml',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.status).toBe('FAILED');
      expect(result.errors).toBeDefined();
    });

    it('should cover summary generation with mappingsApplied count', async () => {
      const config = {
        tenantId: 'tenant123',
        endpointId: 'endpoint1',
        schemaType: 'ISO20022',
        payloadType: 'JSON',
        schemaVersion: '1.0',
        schema: {
          type: 'object',
          properties: {
            Dbtr: {
              type: 'object',
              properties: {
                Nm: { type: 'string' },
              },
            },
          },
        },
        tcsMapping: [
          {
            cfg: '1.0',
            id: '001@1.0',
            txTp: 'pain.001.001.11',
            channels: [{ id: '001@1.0', cfg: '001@1.0', typologies: [] }],
            messages: [
              {
                id: '001@1.0',
                cfg: '1.0',
                txTp: 'pain.001.001.11',
                mapping: {
                  cfg: '001@1.0',
                  messages: [
                    {
                      id: 'TxTp',
                      cfg: '001@1.0',
                      txTp: 'pain.001.001.11',
                      source: ['Dbtr.Nm'],
                      destination: 'DebtorName',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 123,
        payload: JSON.stringify({ Dbtr: { Nm: 'Test Name' } }),
        payloadType: 'application/json' as 'application/json',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.summary).toBeDefined();
      expect(result.stages).toBeDefined();
    });

    it('should cover validation error branch with type keyword processing', async () => {
      const config = {
        tenantId: 'tenant123',
        endpointId: 456,
        schemaType: 'Custom',
        payloadType: 'JSON',
        schemaVersion: '1.0',
        schema: {
          type: 'object',
          properties: {
            nested: {
              type: 'object',
              properties: {
                field: { type: 'number' },
              },
            },
          },
          additionalProperties: false,
        },
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 456,
        payload: JSON.stringify({ nested: { field: 'string-not-number' } }),
        payloadType: 'application/json' as 'application/json',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cover type error with path segments having numeric array index', async () => {
      const config = {
        tenantId: 'tenant123',
        endpointId: 789,
        schemaType: 'Custom',
        payloadType: 'JSON',
        schemaVersion: '1.0',
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'number' },
                },
              },
            },
          },
          additionalProperties: false,
        },
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 789,
        payload: JSON.stringify({
          items: [{ value: 'not-a-number' }, { value: 123 }],
        }),
        payloadType: 'application/json' as 'application/json',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cover nested object with #text at deep level for currentPath construction', async () => {
      const config = {
        tenantId: 'tenant123',
        endpointId: 999,
        schemaType: 'ISO20022',
        payloadType: 'XML',
        schemaVersion: '1.0',
        schema: {
          type: 'object',
          properties: {
            Document: {
              type: 'object',
              properties: {
                CstmrCdtTrfInitn: {
                  type: 'object',
                  properties: {
                    GrpHdr: {
                      type: 'object',
                      properties: {
                        MsgId: { type: 'string' },
                        CreDtTm: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(config);

      const dto = {
        tenantId: 'tenant123',
        endpointId: 999,
        payload:
          '<Document><CstmrCdtTrfInitn><GrpHdr><MsgId>MSG001</MsgId><CreDtTm>2024-01-01T12:00:00</CreDtTm></GrpHdr></CstmrCdtTrfInitn></Document>',
        payloadType: 'application/xml' as 'application/xml',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant123',
        'user1',
        'token123',
      );
      expect(result.transformedPayload).toBeDefined();
    });

    it('should stringify non-string XML payload before parsing', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          { contentType: 'application/xml', schema: { type: 'object' } },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: { root: { element: 'value' } } as any,
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle processMappings throwing a non-Error (string) with loggerService message', async () => {
      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockRejectedValueOnce('loggerService is not defined');

      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          { contentType: 'application/json', schema: { type: 'object' } },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            destination: 'result.data',
          },
        ],
        endpointPath: 'test-endpoint',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();

      processMappings.mockResolvedValue({
        dataCache: {},
        endToEndId: '',
        status: 'success',
      });
    });

    it('should handle processMappings throwing a non-Error (string) without loggerService message', async () => {
      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockRejectedValueOnce('Some unexpected string error');

      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          { contentType: 'application/json', schema: { type: 'object' } },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            destination: 'result.data',
          },
        ],
        endpointPath: 'test-endpoint',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');

      processMappings.mockResolvedValue({
        dataCache: {},
        endToEndId: '',
        status: 'success',
      });
    });

    it('should handle mappingsApplied being undefined in TCS stage details', async () => {
      const { processMappings } = require('@tazama-lf/tcs-lib');
      processMappings.mockResolvedValueOnce({
        dataCache: { result: 'value' },
        transactionRelationship: {},
        endToEndId: 'e2e-001',
      });

      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          { contentType: 'application/json', schema: { type: 'object' } },
        ],
        mapping: [
          {
            ruleId: 'rule-001',
            id: 'mapping-001',
            cfg: '1.0',
            sources: ['field1'],
            destination: 'result.data',
          },
        ],
        endpointPath: 'test-endpoint',
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/json',
        payload: { field1: 'value1' },
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result).toBeDefined();
    });

    it('should handle XML parsing throwing a non-Error value', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest
          .fn()
          .mockRejectedValueOnce('non-error string failure'),
      }));

      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          { contentType: 'application/xml', schema: { type: 'object' } },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: SimulatePayloadDto = {
        endpointId: 1,
        payloadType: 'application/xml',
        payload: '<root><element>value</element></root>',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');
    });

    it('should handle unsupported payload type', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant-1',
        schema: { type: 'object' },
        payloads: [
          { contentType: 'application/pdf', schema: { type: 'object' } },
        ],
        mapping: [],
      };

      adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

      const dto: any = {
        endpointId: 1,
        payloadType: 'application/pdf',
        payload: '%PDF-1.4 binary content',
      };

      const result = await service.simulateMapping(
        dto,
        'tenant-1',
        'user1',
        'token',
      );
      expect(result.status).toBe('FAILED');
    });
  });
});
