import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';

describe('JSON Array Path Handling', () => {
  let service: SimulationService;

  const mockPayload = {
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

  beforeEach(async () => {
    const mockConfigRepository = {
      findConfigById: jest.fn(),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: ConfigRepository, useValue: mockConfigRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  describe('Field Value Access', () => {
    it('should handle dot notation array paths', () => {
      const paths = [
        'organization.teams.0.teamId',
        'organization.teams.0.projects.0.projectId',
        'organization.teams.0.projects.0.modules.0.moduleId',
        'organization.teams.0.projects.0.modules.0.tasks.0.taskId',
        'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.id',
        'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.name',
      ];

      // Use reflection to access private method
      const getFieldValue = (service as any).getFieldValue.bind(service);

      paths.forEach((path) => {
        const value = getFieldValue(mockPayload, path);
        expect(value).toBeDefined();
        // console.log(`Path: ${path} -> ${JSON.stringify(value)}`);
      });

      expect(getFieldValue(mockPayload, 'organization.teams.0.teamId')).toBe(
        'T01',
      );
      expect(
        getFieldValue(
          mockPayload,
          'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.id',
        ),
      ).toBe('U101');
    });

    it('should handle bracket notation array paths', () => {
      const paths = [
        'organization.teams[0].teamId',
        'organization.teams[0].projects[0].projectId',
        'organization.teams[0].projects[0].modules[0].moduleId',
        'organization.teams[0].projects[0].modules[0].tasks[0].taskId',
        'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
        'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].name',
      ];

      const getFieldValue = (service as any).getFieldValue.bind(service);

      paths.forEach((path) => {
        const value = getFieldValue(mockPayload, path);
        expect(value).toBeDefined();
        // console.log(`Path: ${path} -> ${JSON.stringify(value)}`);
      });

      expect(getFieldValue(mockPayload, 'organization.teams[0].teamId')).toBe(
        'T01',
      );
      expect(
        getFieldValue(
          mockPayload,
          'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
        ),
      ).toBe('U101');
    });

    it('should handle getValueByPath with both notations', () => {
      const getValueByPath = (service as any).getValueByPath.bind(service);

      // Test dot notation
      expect(getValueByPath(mockPayload, 'organization.teams.0.teamId')).toBe(
        'T01',
      );
      expect(
        getValueByPath(
          mockPayload,
          'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.id',
        ),
      ).toBe('U101');

      // Test bracket notation (should now work)
      expect(getValueByPath(mockPayload, 'organization.teams[0].teamId')).toBe(
        'T01',
      );
      expect(
        getValueByPath(
          mockPayload,
          'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
        ),
      ).toBe('U101');
    });
  });

  describe('Mapping Validation', () => {
    it('should validate mappings with deep array paths', () => {
      const mappings = [
        {
          source: [
            'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].id',
          ],
          destination: 'redis.userId',
          transformation: 'NONE',
        },
        {
          source: [
            'organization.teams.0.projects.0.modules.0.tasks.0.assignees.0.name',
          ],
          destination: 'redis.userName',
          transformation: 'NONE',
        },
      ];

      const validateMappings = (service as any).validateMappings.bind(service);
      const errors = validateMappings(mockPayload, mappings);

      expect(errors).toHaveLength(0);
    });

    it('should detect missing fields in deep array paths', () => {
      const mappings = [
        {
          source: [
            'organization.teams[0].projects[0].modules[0].tasks[0].assignees[0].missingField',
          ],
          destination: 'redis.missingValue',
          transformation: 'NONE',
        },
      ];

      const validateMappings = (service as any).validateMappings.bind(service);
      const errors = validateMappings(mockPayload, mappings);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('None of the source fields exist');
    });
  });

  describe('Array Path Detection', () => {
    it('should correctly identify array paths', () => {
      const isArrayPath = (service as any).isArrayPath.bind(service);

      // Test paths that should be identified as array paths
      expect(isArrayPath(mockPayload, '/organization/teams/0')).toBe(true);
      expect(isArrayPath(mockPayload, '/organization/teams/0/projects')).toBe(
        true,
      );
      expect(isArrayPath(mockPayload, '/organization/teams/0/projects/0')).toBe(
        true,
      );
      expect(isArrayPath(mockPayload, '/organization/teams/0/teamId')).toBe(
        true,
      ); // This is accessing through an array

      // Test paths that should not be identified as array paths
      expect(isArrayPath(mockPayload, '/organization')).toBe(false);
    });
  });
});
