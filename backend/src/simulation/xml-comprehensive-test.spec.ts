import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';

describe('XML Simulation - Comprehensive Tests', () => {
  let service: SimulationService;
  let configRepository: ConfigRepository;

  const mockConfig = {
    id: 1,
    name: 'XML Simulation Config',
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
                    NbOfTxs: { type: 'string' }
                  }
                },
                CdtTrfTxInf: {
                  type: 'object',
                  properties: {
                    PmtId: {
                      type: 'object',
                      properties: {
                        InstrId: { type: 'string' },
                        EndToEndId: { type: 'string' }
                      }
                    },
                    IntrBkSttlmAmt: { type: 'string' }, // Schema expects string for amount
                    ChrgBr: { type: 'string' }, // Simple text element
                    Dbtr: {
                      type: 'object',
                      properties: {
                        Nm: { type: 'string' },
                        Id: {
                          type: 'object',
                          properties: {
                            PrvtId: { type: 'string' }
                          }
                        }
                      }
                    },
                    Cdtr: {
                      type: 'object',
                      properties: {
                        Nm: { type: 'string' },
                        Id: {
                          type: 'object',
                          properties: {
                            PrvtId: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
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
      {
        id: 3,
        source: ['Document.FIToFICstmrCdtTrf.CdtTrfTxInf.ChrgBr'],
        destination: 'transactionDetails.ChargeBorn',
        transformation: 'NONE',
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

    configRepository.findConfigById = jest.fn().mockResolvedValue(mockConfig);
  });

  describe('XML Payload Processing', () => {
    it('should handle XML elements with attributes and text content', async () => {
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
      <ChrgBr>DEBT</ChrgBr>
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

      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: xmlPayload,
      };

      const result = await service.simulateMapping(dto, 'test-tenant', 'test-user');

      expect(result.status).toBe('PASSED');
      expect(result.stages).toHaveLength(5);
      expect(result.stages.every(stage => stage.status === 'PASSED')).toBe(true);
      expect(result.summary.passedStages).toBe(5);
      expect(result.summary.failedStages).toBe(0);
      expect(result.summary.mappingsApplied).toBe(3);
    });

    it('should handle mixed XML elements (with and without attributes)', async () => {
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>TXN67890</MsgId>
      <CreDtTm>2023-10-16T09:45:00</CreDtTm>
      <NbOfTxs>2</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR002</InstrId>
        <EndToEndId>E2E002</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="EUR" DecimalPlaces="2">250.75</IntrBkSttlmAmt>
      <ChrgBr>SHAR</ChrgBr>
      <Dbtr>
        <Nm>Alice Johnson</Nm>
        <Id>
          <PrvtId>CUST789</PrvtId>
        </Id>
      </Dbtr>
      <Cdtr>
        <Nm>Bob Wilson</Nm>
        <Id>
          <PrvtId>CUST101112</PrvtId>
        </Id>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: xmlPayload,
      };

      const result = await service.simulateMapping(dto, 'test-tenant', 'test-user');

      expect(result.status).toBe('PASSED');
      expect(result.stages.find(s => s.name.includes('Parse Payload'))?.status).toBe('PASSED');
      expect(result.stages.find(s => s.name.includes('Validate Schema'))?.status).toBe('PASSED');
      expect(result.stages.find(s => s.name.includes('Validate Mappings'))?.status).toBe('PASSED');
      expect(result.stages.find(s => s.name.includes('TCS Mapping'))?.status).toBe('PASSED');
    });

    it('should handle XML namespaces correctly', async () => {
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.11" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>NAMESPACE_TEST</MsgId>
      <CreDtTm>2023-10-17T14:20:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>NS_INSTR001</InstrId>
        <EndToEndId>NS_E2E001</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="GBP">500.00</IntrBkSttlmAmt>
      <ChrgBr>CRED</ChrgBr>
      <Dbtr>
        <Nm>Namespace Debtor</Nm>
        <Id>
          <PrvtId>NS_DEBT123</PrvtId>
        </Id>
      </Dbtr>
      <Cdtr>
        <Nm>Namespace Creditor</Nm>
        <Id>
          <PrvtId>NS_CRED456</PrvtId>
        </Id>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: xmlPayload,
      };

      const result = await service.simulateMapping(dto, 'test-tenant', 'test-user');

      expect(result.status).toBe('PASSED');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>MALFORMED_TEST</MsgId>
      <CreDtTm>2023-10-18T10:15:00</CreDtTm>
      <!-- Missing closing tag for NbOfTxs -->
      <NbOfTxs>1
    </GrpHdr>
  </FIToFICstmrCdtTrf>
</Document>`;

      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: malformedXml,
      };

      const result = await service.simulateMapping(dto, 'test-tenant', 'test-user');

      expect(result.status).toBe('FAILED');
      expect(result.stages.find(s => s.name.includes('Parse Payload'))?.status).toBe('FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Invalid XML payload');
    });

    it('should handle empty XML payload', async () => {
      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: '',
      };

      const result = await service.simulateMapping(dto, 'test-tenant', 'test-user');

      expect(result.status).toBe('FAILED');
      expect(result.stages.find(s => s.name.includes('Parse Payload'))?.status).toBe('FAILED');
      expect(result.errors[0].message).toContain('XML payload cannot be empty');
    });
  });

  describe('Schema-Aware XML Normalization', () => {
    it('should extract text content when schema expects string', async () => {
      // Test the normalization method directly
      const parseMethod = (service as any).parsePayload.bind(service);
      const normalizeMethod = (service as any).normalizePayloadForValidation.bind(service);

      const xmlPayload = `<IntrBkSttlmAmt Ccy="USD">100.00</IntrBkSttlmAmt>`;
      const parsed = await parseMethod(xmlPayload, 'application/xml');
      
      // Mock schema that expects string for IntrBkSttlmAmt
      const schema = {
        type: 'object',
        properties: {
          IntrBkSttlmAmt: { type: 'string' }
        }
      };

      const normalized = normalizeMethod(parsed, { schema });
      
      // Should extract just the text content since schema expects string
      expect(normalized.IntrBkSttlmAmt).toBe('100.00');
      expect(typeof normalized.IntrBkSttlmAmt).toBe('string');
    });

    it('should preserve structure when schema expects object', async () => {
      const parseMethod = (service as any).parsePayload.bind(service);
      const normalizeMethod = (service as any).normalizePayloadForValidation.bind(service);

      const xmlPayload = `<ComplexElement>
        <TextPart>Some text</TextPart>
        <NumericPart>123</NumericPart>
      </ComplexElement>`;
      const parsed = await parseMethod(xmlPayload, 'application/xml');
      
      // Mock schema that expects object
      const schema = {
        type: 'object',
        properties: {
          ComplexElement: {
            type: 'object',
            properties: {
              TextPart: { type: 'string' },
              NumericPart: { type: 'string' }
            }
          }
        }
      };

      const normalized = normalizeMethod(parsed, { schema });
      
      // Should preserve object structure
      expect(typeof normalized.ComplexElement).toBe('object');
      expect(normalized.ComplexElement.TextPart).toBe('Some text');
      expect(normalized.ComplexElement.NumericPart).toBe('123');
    });
  });

  describe('XML Integration with TCS Mapping', () => {
    it('should successfully execute TCS mappings on XML data', async () => {
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>TCS_TEST_001</MsgId>
      <CreDtTm>2023-10-19T16:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>TCS_INSTR001</InstrId>
        <EndToEndId>TCS_E2E001</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="USD">750.00</IntrBkSttlmAmt>
      <ChrgBr>SLEV</ChrgBr>
      <Dbtr>
        <Nm>TCS Debtor</Nm>
        <Id>
          <PrvtId>TCS_DEBT789</PrvtId>
        </Id>
      </Dbtr>
      <Cdtr>
        <Nm>TCS Creditor</Nm>
        <Id>
          <PrvtId>TCS_CRED012</PrvtId>
        </Id>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

      const dto = {
        endpointId: 1,
        payloadType: 'application/xml' as const,
        payload: xmlPayload,
      };

      const result = await service.simulateMapping(dto, 'test-tenant', 'test-user');

      expect(result.status).toBe('PASSED');
      expect(result.tcsResult).toBeDefined();
      expect(result.summary.mappingsApplied).toBe(3);
      
      // Verify TCS mapping stage passed
      const tcsStage = result.stages.find(s => s.name.includes('TCS Mapping'));
      expect(tcsStage?.status).toBe('PASSED');
      expect(tcsStage?.message).toContain('Successfully executed 3 TCS mapping function(s)');
    });
  });
});