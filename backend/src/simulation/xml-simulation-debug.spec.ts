import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';

describe('XML Simulation Debug', () => {
  let service: SimulationService;
  let configRepository: ConfigRepository;

  const mockConfig = {
    id: 1,
    name: 'Test XML Config',
    status: 'approved',
    data_model_id: 1,
    schema: {
      type: 'object',
      properties: {
        Document: {
          type: 'object',
          properties: {
            FIToFICstmrCdtTrf: {
              type: 'object',
              properties: {
                GrpHdr: {
                  type: 'object',
                  properties: {
                    MsgId: { type: 'string' },
                    CreDtTm: { type: 'string' },
                    NbOfTxs: { type: 'string' },
                  },
                },
                CdtTrfTxInf: {
                  type: 'object',
                  properties: {
                    PmtId: {
                      type: 'object',
                      properties: {
                        InstrId: { type: 'string' },
                        EndToEndId: { type: 'string' },
                      },
                    },
                    IntrBkSttlmAmt: { type: 'string' },
                    Dbtr: {
                      type: 'object',
                      properties: {
                        Nm: { type: 'string' },
                        Id: {
                          type: 'object',
                          properties: {
                            PrvtId: { type: 'string' },
                          },
                        },
                      },
                    },
                    Cdtr: {
                      type: 'object',
                      properties: {
                        Nm: { type: 'string' },
                        Id: {
                          type: 'object',
                          properties: {
                            PrvtId: { type: 'string' },
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
        source: ['Document.FIToFICstmrCdtTrf.GrpHdr.MsgId'],
        destination: 'transactionDetails.MsgId',
        transformation: 'NONE',
      },
      {
        id: 2,
        source: ['Document.FIToFICstmrCdtTrf.CdtTrfTxInf.IntrBkSttlmAmt'],
        destination: 'transactionDetails.Amt',
        transformation: 'NONE',
      },
    ],
  };

  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.11">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>TXN12345</MsgId>
      <CreDtTm>2023-10-15T10:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR001</InstrId>
        <EndToEndId>E2E001</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="USD">100.00</IntrBkSttlmAmt>
      <Dbtr>
        <Nm>John Doe</Nm>
        <Id>
          <PrvtId>CUST123</PrvtId>
        </Id>
      </Dbtr>
      <Cdtr>
        <Nm>Jane Smith</Nm>
        <Id>
          <PrvtId>CUST456</PrvtId>
        </Id>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

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

    configRepository.findConfigById = jest.fn().mockResolvedValue(mockConfig);
  });

  describe('XML Payload Simulation', () => {
    it('should successfully simulate XML payload processing', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: xmlPayload,
      };

      const result = await service.simulateMapping(
        dto,
        'test-tenant',
        'test-user',
      );

      console.log('=== XML SIMULATION RESULT ===');
      console.log('Status:', result.status);
      console.log('Stages:');
      result.stages.forEach((stage, index) => {
        console.log(`  ${index + 1}. ${stage.name}: ${stage.status}`);
        console.log(`     Message: ${stage.message}`);
        if (stage.errors) {
          console.log('     Errors:', stage.errors);
        }
      });

      if (result.errors.length > 0) {
        console.log('Overall Errors:', result.errors);
      }

      if (result.tcsResult) {
        console.log('TCS Result:', JSON.stringify(result.tcsResult, null, 2));
      }

      console.log('Summary:', result.summary);
      console.log('=== END XML SIMULATION RESULT ===');

      // The test should not fail - we're just investigating
      expect(result).toBeDefined();
    });

    it('should debug XML parsing step by step', async () => {
      console.log('=== XML PARSING DEBUG ===');

      // Test XML parsing directly
      const parseMethod = (service as any).parsePayload.bind(service);
      const parsedPayload = await parseMethod(xmlPayload, 'application/xml');

      console.log('1. Parsed XML Payload:');
      console.log(JSON.stringify(parsedPayload, null, 2));

      // Test normalization
      const normalizeMethod = (
        service as any
      ).normalizePayloadForValidation.bind(service);
      const normalizedPayload = normalizeMethod(parsedPayload, mockConfig);

      console.log('2. Normalized Payload:');
      console.log(JSON.stringify(normalizedPayload, null, 2));

      // Test schema validation
      const validateMethod = (service as any).validatePayloadAgainstSchema.bind(
        service,
      );
      const validationErrors = validateMethod(
        parsedPayload,
        mockConfig.schema,
        mockConfig,
      );

      console.log('3. Schema Validation Errors:');
      console.log(JSON.stringify(validationErrors, null, 2));

      console.log('=== END XML PARSING DEBUG ===');

      expect(parsedPayload).toBeDefined();
    });
  });
});
