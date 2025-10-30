import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';

describe('SPLIT Transformation Simulation', () => {
  let service: SimulationService;
  let configRepository: ConfigRepository;

  const mockConfigWithSplit = {
    id: 1,
    name: 'SPLIT Test Config',
    status: 'approved',
    data_model_id: 1,
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        address: { type: 'string' },
      },
    },
    mapping: [
      {
        id: 1,
        source: ['fullName'],
        destination: [
          'transactionDetails.firstName',
          'transactionDetails.lastName',
        ],
        transformation: 'SPLIT',
        delimiter: ' ',
      },
      {
        id: 2,
        source: ['address'],
        destination: [
          'transactionDetails.street',
          'transactionDetails.city',
          'transactionDetails.state',
        ],
        transformation: 'SPLIT',
        delimiter: ',',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: ConfigRepository,
          useValue: {
            findConfigById: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    configRepository = module.get<ConfigRepository>(ConfigRepository);

    configRepository.findConfigById = jest
      .fn()
      .mockResolvedValue(mockConfigWithSplit);
  });

  describe('SPLIT Transformation Issues', () => {
    it('should handle SPLIT transformation to multiple destinations', async () => {
      const payload = {
        fullName: 'John Doe',
        address: '123 Main St,New York,NY',
      };

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: payload,
      };

      const result = await service.simulateMapping(
        dto,
        'test-tenant',
        'test-user',
      );

      console.log('=== SPLIT TRANSFORMATION DEBUG ===');
      console.log('Status:', result.status);
      console.log('Stages:');
      result.stages.forEach((stage, index) => {
        console.log(`  ${index + 1}. ${stage.name}: ${stage.status}`);
        console.log(`     Message: ${stage.message}`);
        if (stage.errors) {
          console.log('     Errors:', stage.errors);
        }
      });

      if (result.tcsResult) {
        console.log('TCS Result:');
        console.log('  dataCache:', result.tcsResult.dataCache);
        console.log(
          '  transactionRelationship:',
          result.tcsResult.transactionRelationship,
        );
        console.log('  endToEndId:', result.tcsResult.endToEndId);
      }

      // Check if transformation details show the split values
      if (result.stages.length > 4) {
        const tcsStage = result.stages[4]; // TCS mapping stage
        if (tcsStage.details?.mappingDetails) {
          console.log('Mapping Details:');
          tcsStage.details.mappingDetails.forEach(
            (detail: any, index: number) => {
              console.log(`  Mapping ${index + 1}:`);
              console.log(`    Destination: ${detail.destination}`);
              console.log(`    Sources: ${JSON.stringify(detail.sources)}`);
              console.log(
                `    Source Values: ${JSON.stringify(detail.sourceValues)}`,
              );
              console.log(`    Transformation: ${detail.transformation}`);
              console.log(
                `    Result Value: ${JSON.stringify(detail.resultValue)}`,
              );
              console.log(`    Delimiter: ${detail.delimiter}`);
            },
          );
        }
      }

      console.log('=== END SPLIT TRANSFORMATION DEBUG ===');

      expect(result).toBeDefined();

      // The issue: SPLIT transformations should create multiple TCS mappings
      // but currently only create one mapping per source

      // Test what we expect vs what currently happens
      if (result.tcsResult) {
        // For fullName "John Doe" split by " ", we should see:
        // - firstName: "John"
        // - lastName: "Doe"

        // For address "123 Main St,New York,NY" split by ",", we should see:
        // - street: "123 Main St"
        // - city: "New York"
        // - state: "NY"

        console.log('Expected SPLIT results not found in dataCache');
      }
    });

    it('should debug TCS mapping conversion for SPLIT', async () => {
      console.log('=== TCS MAPPING CONVERSION DEBUG ===');

      // Test the convertConfigToTCSMapping method directly
      const convertMethod = (service as any).convertConfigToTCSMapping.bind(
        service,
      );
      const tcsMapping = convertMethod(mockConfigWithSplit);

      console.log('Original Config Mappings:');
      mockConfigWithSplit.mapping.forEach((mapping, index) => {
        console.log(`  Mapping ${index + 1}:`);
        console.log(`    Source: ${JSON.stringify(mapping.source)}`);
        console.log(`    Destination: ${JSON.stringify(mapping.destination)}`);
        console.log(`    Transformation: ${mapping.transformation}`);
        console.log(`    Delimiter: ${mapping.delimiter}`);
      });

      console.log('Converted TCS Mappings:');
      tcsMapping.mappings.forEach((mapping: any, index: number) => {
        console.log(`  TCS Mapping ${index + 1}:`);
        console.log(`    Destination: ${mapping.destination}`);
        console.log(`    Sources: ${JSON.stringify(mapping.sources)}`);
        console.log(`    Separator: ${mapping.separator}`);
        console.log(`    Prefix: ${mapping.prefix}`);
      });

      console.log('=== END TCS MAPPING CONVERSION DEBUG ===');

      // The issue should be visible here:
      // SPLIT transformations with multiple destinations should create multiple TCS mappings
      // One mapping splits "fullName" into 2 fields, another splits "address" into 3 fields = 5 total
      expect(tcsMapping.mappings).toHaveLength(5); // Should create 5 (2+3)
    });
  });
});
