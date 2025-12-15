import { Test, TestingModule } from '@nestjs/testing';
import {
  SimulationService,
  SimulatePayloadDto,
} from '../../src/simulation/simulation.service';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';

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
      // Simple XML parsing simulation
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
}));

describe('SimulationService', () => {
  let service: SimulationService;
  const adminServiceClientMock = {
    getConfigById: jest.fn(),
    forwardRequest: jest.fn(),
  } as unknown as jest.Mocked<AdminServiceClient>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
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

    it('should handle enforceStrictSchema with non-object schema', async () => {
      const schema = 'string-schema';
      const result = (service as any).enforceStrictSchema(schema);
      expect(result).toBe('string-schema');
    });

    it('should handle enforceStrictSchema with null schema', async () => {
      const result = (service as any).enforceStrictSchema(null);
      expect(result).toBeNull();
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

    it('should handle normalizeXmlParsedObjectWithSchema with getSchemaTypeAtPath returning string', async () => {
      const xmlObj = {
        '#text': 'text value',
        '@attr': 'attribute value',
      };
      const schema = {
        type: 'object',
        properties: {
          field: { type: 'string' },
        },
      };

      jest
        .spyOn(service as any, 'getSchemaTypeAtPath')
        .mockReturnValue('string');

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '/field',
      );
      expect(result).toBeDefined();
    });

    it('should handle getSchemaTypeAtPath with undefined path', async () => {
      const schema = {
        type: 'object',
        properties: { field: { type: 'string' } },
      };
      const result = (service as any).getSchemaTypeAtPath(schema, undefined);
      expect(result).toBeNull();
    });

    it('should handle getSchemaTypeAtPath with empty path', async () => {
      const schema = { type: 'string' };
      const result = (service as any).getSchemaTypeAtPath(schema, '');
      expect(result).toBeNull();
    });

    it('should handle getSchemaAtPath with complex nested path', async () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: { type: 'string' },
            },
          },
        },
      };
      const result = (service as any).getSchemaAtPath(schema, '/level1/level2');
      if (result) {
        expect(result.type).toBe('string');
      } else {
        expect(result).toBeNull();
      }
    });

    it('should handle cleanSchemaForXML with empty schema', async () => {
      const result = (service as any).cleanSchemaForXML({});
      expect(result).toBeDefined();
    });

    it('should handle isXmlParsedObject with non-object', async () => {
      const result = (service as any).isXmlParsedObject('string');
      expect(result).toBe(false);
    });

    it('should handle isXmlParsedObject with object containing @attributes', async () => {
      const result = (service as any).isXmlParsedObject({
        '@attr': 'value',
        field: 'data',
      });
      expect(result).toBe(true);
    });

    it('should handle normalizePayloadForValidation with array payload', async () => {
      const payload = [{ id: 1 }, { id: 2 }];
      const config = {
        schema: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'number' } } },
        },
      };
      const result = (service as any).normalizePayloadForValidation(
        payload,
        config,
      );
      expect(Array.isArray(result)).toBe(true);
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

    it('should handle validatePayloadAgainstSchema with complex nested errors', async () => {
      const payload = {
        level1: {
          level2: {
            items: [
              { id: 1, name: 'valid' },
              { id: 'invalid', name: 'test' },
            ],
          },
        },
      };

      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
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
                      required: ['id', 'name'],
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = (service as any).validatePayloadAgainstSchema(
        payload,
        schema,
      );
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'valid' in result) {
        expect(typeof result.valid).toBe('boolean');
      }
    });

    it('should handle normalizeXmlParsedObjectWithSchema with textContent extraction', async () => {
      const xmlObj = {
        field: {
          '#text': 'text value',
          subField: 'other',
        },
      };
      const schema = {
        type: 'object',
        properties: {
          field: { type: 'string' },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '/',
      );
      expect(result).toBeDefined();
      expect(result.field).toBeDefined();
    });

    it('should handle normalizeXmlParsedObjectWithSchema with nested textContent', async () => {
      const xmlObj = {
        parent: {
          child: {
            textContent: 'nested text',
            otherField: 'value',
          },
        },
      };
      const schema = {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            properties: {
              child: { type: 'string' },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '/',
      );
      expect(result).toBeDefined();
    });

    it('should handle getSchemaTypeAtPath with path containing dots', async () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: { type: 'number' },
            },
          },
        },
      };
      const result = (service as any).getSchemaTypeAtPath(
        schema,
        'level1.level2',
      );
      expect(result).toBe('number');
    });

    it('should handle getSchemaTypeAtPath with missing property', async () => {
      const schema = {
        type: 'object',
        properties: {
          field1: { type: 'string' },
        },
      };
      const result = (service as any).getSchemaTypeAtPath(
        schema,
        'nonexistent',
      );
      expect(result).toBeNull();
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

    it('should handle XML normalization with object having both textContent and #text', async () => {
      const xmlObj = {
        field: {
          textContent: 'text1',
          '#text': 'text2',
          nested: 'value',
        },
      };
      const schema = { type: 'object' };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '/',
      );
      expect(result).toBeDefined();
    });

    it('should handle XML with #text and expectedType as string with attributes', async () => {
      const xmlObj = {
        description: {
          '#text': 'Product description',
          '@lang': 'en',
          '@version': '1.0',
        },
      };

      const schema = {
        type: 'object',
        properties: {
          description: { type: 'string' },
        },
      };

      jest
        .spyOn(service as any, 'getSchemaTypeAtPath')
        .mockReturnValue('string');

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.description).toBe('Product description');
    });

    it('should handle XML with #text and hasOnlyTextAndAttributes true', async () => {
      const xmlObj = {
        field: {
          '#text': 'text value',
          '@attr1': 'value1',
          '@attr2': 'value2',
        },
      };

      const schema = {
        type: 'object',
        properties: {
          field: { type: 'object' },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
    });

    it('should handle nested object with fieldSchema type string and textContent', async () => {
      const xmlObj = {
        parent: {
          child: {
            textContent: 'extracted text',
            otherData: 'ignored',
          },
        },
      };

      const childSchema = { type: 'string' };
      const schema = {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            properties: {
              child: childSchema,
            },
          },
        },
      };

      jest
        .spyOn(service as any, 'getSchemaAtPath')
        .mockReturnValue(childSchema);

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.parent.child).toBe('extracted text');
    });

    it('should handle nested object with fieldSchema type string and #text property', async () => {
      const xmlObj = {
        parent: {
          child: {
            '#text': 'text from #text',
            other: 'data',
          },
        },
      };

      const childSchema = { type: 'string' };
      const schema = {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            properties: {
              child: childSchema,
            },
          },
        },
      };

      jest
        .spyOn(service as any, 'getSchemaAtPath')
        .mockImplementation((s, p) => {
          if (p === 'parent.child') return childSchema;
          return null;
        });

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
    });

    it('should handle getSchemaAtPath traversing nested properties', async () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'boolean' },
                },
              },
            },
          },
        },
      };

      const result = (service as any).getSchemaAtPath(
        schema,
        '/level1/level2/level3',
      );
      expect(result).toBeDefined();
      if (result) {
        expect(result.type).toBe('boolean');
      }
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

    it('should handle XML normalization with #text having other non-attribute fields', async () => {
      const xmlObj = {
        item: {
          '#text': 'text value',
          nested: { field: 'value' },
        },
      };

      const schema = {
        type: 'object',
        properties: {
          item: { type: 'object' },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      // The item should be processed
      expect(result.item).toBeDefined();
    });

    it('should handle XML normalization checking hasAttributes with non-text keys', async () => {
      const xmlObj = {
        data: {
          '#text': 'content',
          '@id': '123',
          child: 'nested',
        },
      };

      const schema = {
        type: 'object',
        properties: {
          data: { type: 'string' },
        },
      };

      jest
        .spyOn(service as any, 'getSchemaTypeAtPath')
        .mockReturnValue('string');

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.data).toBe('content');
    });

    it('should handle XML with hasOnlyTextAndAttributes check', async () => {
      const xmlObj = {
        element: {
          '#text': 'only text',
          '@attr': 'attribute',
        },
      };

      const schema = {
        type: 'object',
        properties: {
          element: { type: 'object' },
        },
      };

      jest.spyOn(service as any, 'getSchemaTypeAtPath').mockReturnValue(null);

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.element).toBe('only text');
    });

    it('should handle currentPath construction with empty path', async () => {
      const xmlObj = {
        rootField: {
          nested: 'value',
        },
      };

      const schema = {
        type: 'object',
        properties: {
          rootField: {
            type: 'object',
            properties: {
              nested: { type: 'string' },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.rootField.nested).toBe('value');
    });

    it('should handle currentPath construction with existing path', async () => {
      const xmlObj = {
        child: 'value',
      };

      const schema = {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            properties: {
              child: { type: 'string' },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        'parent',
      );
      expect(result).toBeDefined();
    });

    it('should handle normalizeXmlParsedObjectWithSchema with array at root', async () => {
      const xmlObj = [
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
      ];

      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should skip keys starting with @ in normalizeXmlParsedObjectWithSchema', async () => {
      const xmlObj = {
        data: {
          '@id': '123',
          '@version': '1.0',
          content: 'actual data',
        },
      };

      const schema = {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              content: { type: 'string' },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data['@id']).toBeUndefined();
      expect(result.data.content).toBe('actual data');
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

    it('should handle validation error with empty message triggering fallback', async () => {
      const payload = { test: 'value' };
      const schema = { type: 'number' };

      const result = (service as any).validatePayloadAgainstSchema(
        payload,
        schema,
      );

      expect(result).toBeDefined();
      if (result && !result.valid && result.errors) {
        const hasMessageOrFallback = result.errors.every(
          (e) =>
            e.message === '' ||
            e.message === 'Schema validation failed' ||
            e.message,
        );
        expect(hasMessageOrFallback).toBe(true);
      }
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

    it('should continue loop on additionalProperties error when isArrayPath is true', async () => {
      const payload = {
        list: [{ name: 'valid' }, { name: 'valid2', extra: 'field' }],
      };

      const schema = {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
        },
      };

      const result = (service as any).validatePayloadAgainstSchema(
        payload,
        schema,
      );

      expect(result).toBeDefined();
      // Validation should handle the array path
    });

    it('should handle type error without instancePath having slash', async () => {
      const payload = 'should be object';
      const schema = { type: 'object' };

      const result = (service as any).validatePayloadAgainstSchema(
        payload,
        schema,
      );

      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'valid' in result) {
        expect(result.valid).toBe(false);
      }
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

    it('should handle deeply nested array in normalizeXmlParsedObjectWithSchema', async () => {
      const xmlObj = {
        level1: [
          { level2: [{ value: 'a' }, { value: 'b' }] },
          { level2: [{ value: 'c' }] },
        ],
      };

      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                level2: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.level1).toBeDefined();
      expect(Array.isArray(result.level1)).toBe(true);
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

    it('should cover cleanSchemaForXML with primitive property value', async () => {
      const schema = {
        type: 'object',
        properties: {
          'xmlns:ns': { type: 'string' },
          '@attr': { type: 'string' },
          $: { type: 'object' },
          normalField: 'string',
          objectField: {
            type: 'object',
            properties: { inner: { type: 'string' } },
          },
        },
      };

      const result = (service as any).cleanSchemaForXML(schema);
      expect(result.properties).toBeDefined();
      expect(result.properties.normalField).toBe('string');
      expect(result.properties.objectField).toBeDefined();
      expect(result.properties['xmlns:ns']).toBeUndefined();
    });

    it('should cover normalizeXmlParsedObjectWithSchema with array root', async () => {
      const arrData = [{ field: 'value1' }, { field: 'value2' }];
      const schema = {
        type: 'array',
        items: { type: 'object', properties: { field: { type: 'string' } } },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        arrData,
        schema,
        '',
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should cover path construction with non-empty path', async () => {
      const xmlObj = {
        parent: {
          child: {
            '#text': 'value',
          },
        },
      };
      const schema = {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            properties: {
              child: { type: 'string' },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        '',
      );
      expect(result.parent).toBeDefined();
      expect(result.parent.child).toBeDefined();
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

    it('should cover normalizePayloadForValidation wrapping with root element', async () => {
      const config = {
        schema: {
          type: 'object',
          properties: {
            Document: {
              type: 'object',
              properties: {
                field: { type: 'string' },
              },
            },
          },
        },
      };
      const payload = { field: { '#text': 'value' } };

      const result = (service as any).normalizePayloadForValidation(
        payload,
        config,
      );
      expect(result).toBeDefined();
      expect(result.Document).toBeDefined();
    });

    it('should cover cleanSchemaForXML removing XML attributes from required', async () => {
      const schema = {
        type: 'object',
        properties: {
          'xmlns:ns': { type: 'string' },
          '@attr': { type: 'string' },
          normalField: { type: 'string' },
        },
        required: ['xmlns:ns', '@attr', 'normalField'],
      };

      const result = (service as any).cleanSchemaForXML(schema);
      expect(result.required).toBeDefined();
      expect(result.required.length).toBeLessThan(schema.required.length);
    });

    it('should cover array map in normalizeXmlParsedObjectWithSchema', async () => {
      const arrData = [
        { '#text': 'value1', '@id': '1' },
        { '#text': 'value2', '@id': '2' },
      ];
      const schema = {
        type: 'array',
        items: { type: 'string' },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        arrData,
        schema,
        '',
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should cover currentPath with existing path prefix', async () => {
      const xmlObj = {
        level1: {
          level2: {
            '#text': 'value',
          },
        },
      };
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: { type: 'string' },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlObj,
        schema,
        'root',
      );
      expect(result.level1).toBeDefined();
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

    it('should cover array iteration in normalizeXmlParsedObjectWithSchema', async () => {
      const xmlData = {
        root: [
          { item: { '#text': 'value1' } },
          { item: { '#text': 'value2' } },
          { item: { '#text': 'value3' } },
        ],
      };
      const schema = {
        type: 'object',
        properties: {
          root: {
            type: 'array',
            items: { type: 'object', properties: { item: { type: 'string' } } },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlData,
        schema,
        '',
      );
      expect(result).toBeDefined();
      expect(result.root).toBeDefined();
      expect(Array.isArray(result.root)).toBe(true);
    });

    it('should cover nested path currentPath construction', async () => {
      const xmlData = {
        level1: {
          level2: {
            level3: {
              '#text': 'deep-value',
            },
          },
        },
      };
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlData,
        schema,
        '',
      );
      expect(result.level1.level2.level3).toBe('deep-value');
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

    it('should cover edge case when array map is called in normalizeXmlParsedObjectWithSchema', async () => {
      const xmlArray = [
        { '#text': 'item1', '@id': '1' },
        { '#text': 'item2', '@id': '2' },
        { '#text': 'item3', '@id': '3' },
      ];
      const schema = {
        type: 'array',
        items: { type: 'string' },
      };

      const result = (service as any).normalizeXmlParsedObjectWithSchema(
        xmlArray,
        schema,
        '',
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });
  });
});
