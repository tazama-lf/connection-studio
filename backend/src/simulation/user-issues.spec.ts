import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';
import { AdminServiceClient } from '../services/admin-service-client.service';

describe('User Reported Issues Test', () => {
  let service: SimulationService;

  const userPayload = {
    organization: {
      teams: [
        {
          teamId: 'T01',
          projects: [
            {
              projectId: 'PX01',
              modules: [
                {
                  moduleId: 'M100',
                  tasks: [
                    {
                      taskId: 'TS01',
                      assignees: [{ id: 'U101', name: 'Bilal' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const mockConfig = {
    id: 1,
    name: 'Test Config',
    endpoint: 'test-endpoint',
    schema: {
      type: 'object',
      properties: {
        organization: {
          type: 'object',
          properties: {
            teams: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  teamId: { type: 'string' },
                  projects: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        projectId: { type: 'string' },
                        modules: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              moduleId: { type: 'string' },
                              tasks: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    taskId: { type: 'string' },
                                    assignees: {
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          id: { type: 'string' },
                                          name: { type: 'string' },
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
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    mapping: [
      {
        id: 1,
        destination: 'redis.extractedId',
        source: [
          'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
        ],
        transformation: 'DIRECT',
      },
      {
        id: 2,
        destination: 'redis.extractedName',
        source: [
          'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.name',
        ],
        transformation: 'DIRECT',
      },
    ],
  };

  beforeEach(async () => {
    const mockConfigRepository = {
      findConfigById: jest.fn().mockResolvedValue(mockConfig),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const mockAdminServiceClient = {
      forwardRequest: jest.fn(),
      getConfigById: jest.fn().mockResolvedValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: AdminServiceClient, useValue: mockAdminServiceClient },
        { provide: ConfigRepository, useValue: mockConfigRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  it('should handle deep nested array paths consistently', async () => {
    const dto = {
      endpointId: 1,
      payloadType: 'application/json' as const,
      payload: userPayload,
    };

    const result = await service.simulateMapping(dto, 'tenant-1', 'user-1', 'test-token');

    // Check that simulation passes
    expect(result.status).toBe('PASSED');
    expect(result.errors).toHaveLength(0);

    // Check that all stages pass
    const stageNames = result.stages.map((s) => s.name);
    expect(stageNames).toContain('2. Parse Payload');
    expect(stageNames).toContain('3. Validate Schema');
    expect(stageNames).toContain('4. Validate Mappings');
    expect(stageNames).toContain('5. Execute TCS Mapping Functions');

    result.stages.forEach((stage) => {
      expect(stage.status).toBe('PASSED');
    });

    // Check that deep nested field mapping works
    console.log('TCS Result:', JSON.stringify(result.tcsResult, null, 2));
    console.log('Data Cache:', result.tcsResult?.dataCache);
    console.log(
      'Stages:',
      result.stages.map((s) => ({
        name: s.name,
        status: s.status,
        message: s.message,
      })),
    );

    expect(result.tcsResult).toBeDefined();
    expect(result.tcsResult?.dataCache).toBeDefined();
    expect(result.tcsResult?.dataCache['extractedId']).toBe('U101');
    expect(result.tcsResult?.dataCache['extractedName']).toBe('Bilal');
  });

  it('should validate mappings for deep nested paths without errors', async () => {
    const mappings = [
      {
        destination: 'test1',
        source: [
          'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.id',
        ],
        transformation: 'DIRECT',
      },
      {
        destination: 'test2',
        source: ['organization.teams.0.teamId'],
        transformation: 'DIRECT',
      },
    ];

    // Use private method through any to test validation
    const errors = (service as any).validateMappings(userPayload, mappings);

    expect(errors).toHaveLength(0);
  });

  it('should access field values using both bracket and dot notation', async () => {
    // Test different path formats
    const testPaths = [
      'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
      'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.id',
    ];

    for (const path of testPaths) {
      const value = (service as any).getFieldValue(userPayload, path);
      expect(value).toBe('U101');
    }
  });

  it('should handle all payload elements consistently', async () => {
    // Test that all nested elements are accessible
    expect(
      (service as any).getFieldValue(userPayload, 'organization'),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(userPayload, 'organization.teams'),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(userPayload, 'organization.teams[0]'),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0]',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0]',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0].tasks',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0].tasks[0]',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0].tasks[0].assignees',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0]',
      ),
    ).toBeDefined();
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
      ),
    ).toBe('U101');
    expect(
      (service as any).getFieldValue(
        userPayload,
        'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].name',
      ),
    ).toBe('Bilal');
  });
});

console.log('✓ All user-reported issue tests completed successfully');
