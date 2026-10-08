import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../../src/config/config.service';
import { ConfigRepository } from '../../src/config/config.repository';
import { ConfigWorkflowService } from '../../src/config/config-workflow.service';
import { ConfigUtilsService } from '../../src/config/config-utils.service';
import { SftpService } from '../../src/sftp/sftp.service';
import { DemsClient } from '../../src/services/dems-client.service';
import { NotificationService } from '../../src/notification/notification.service';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';
import { TazamaDataModelService } from '../../src/tazama-data-model/tazama-data-model.service';
import { SchemaValidationService } from '../../src/simulation/schema-validation.service';
import { SimulationService } from '../../src/simulation/simulation.service';
import { Config, ContentType } from '../../src/config/config.interfaces';

/**
 * Issue #135, integration scenario #7.
 *
 * Wires the real ConfigService, SimulationService and SchemaValidationService
 * together; only persistence is faked. A config created through POST /config's
 * schema gate is stored in memory and loaded back by /simulate, so the test
 * proves both entry points reach the same verdict on the same payload/schema.
 */
describe('Config creation ↔ simulation schema parity (issue #135)', () => {
  const tenantId = 'tenant_001';
  const userId = 'user_1';
  const token = 'jwt-token';
  const user = {
    tenantId,
    userId,
    validClaims: ['editor'],
    actorRole: 'editor',
    token: { tokenString: token },
  };

  let configService: ConfigService;
  let simulationService: SimulationService;
  let store: Map<number, Config>;
  let nextId: number;

  const repo = {
    findConfigByMsgFamVersionAndTransactionType: jest.fn(),
    createConfig: jest.fn(),
    findConfigById: jest.fn(),
  };

  const adminServiceClient = {
    getConfigById: jest.fn(),
  };

  beforeEach(async () => {
    store = new Map();
    nextId = 1;

    repo.findConfigByMsgFamVersionAndTransactionType.mockImplementation(
      async (msgFam: string, version: string, transactionType: string) =>
        [...store.values()].find(
          (c) =>
            c.msgFam === msgFam &&
            c.version === version &&
            c.transactionType === transactionType,
        ) ?? null,
    );
    repo.createConfig.mockImplementation(async (data: Config) => {
      const id = nextId++;
      store.set(id, { ...data, id } as Config);
      return id;
    });
    repo.findConfigById.mockImplementation(
      async (id: number) => store.get(id) ?? null,
    );
    // Admin service reads the same table the repository writes to.
    adminServiceClient.getConfigById.mockImplementation(
      async (id: number) => store.get(id) ?? null,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        SimulationService,
        SchemaValidationService,
        { provide: ConfigRepository, useValue: repo },
        { provide: AdminServiceClient, useValue: adminServiceClient },
        { provide: ConfigWorkflowService, useValue: {} },
        {
          provide: ConfigUtilsService,
          useValue: {
            generateEndpointPath: jest.fn().mockReturnValue('/endpoint'),
            buildDuplicateConfigMessage: jest.fn(),
            buildUserErrorMessage: jest.fn((e: Error) => e.message),
          },
        },
        { provide: SftpService, useValue: {} },
        { provide: DemsClient, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: TazamaDataModelService, useValue: {} },
        { provide: 'AUDIT_LOGGER', useValue: {} },
      ],
    }).compile();

    configService = module.get(ConfigService);
    simulationService = module.get(SimulationService);
  });

  const createConfig = (
    payload: unknown,
    schema: Record<string, unknown>,
    contentType: ContentType,
  ) =>
    configService.createConfig(
      {
        msgFam: 'iso20022',
        transactionType: 'pacs.002',
        version: `1.0.${nextId}`,
        contentType,
        payload,
        schema,
      } as any,
      user as any,
    );

  const simulate = (
    endpointId: number,
    payload: unknown,
    payloadType: 'application/json' | 'application/xml',
  ) =>
    simulationService.simulateMapping(
      { endpointId, payload, payloadType },
      tenantId,
      userId,
      token,
    );

  const schemaStage = (result: { stages: { name: string }[] }) =>
    result.stages.find((s) => s.name === '3. Validate Schema') as
      | { status: string; errors?: unknown[] }
      | undefined;

  // ---------------------------------------------------------------- JSON

  const jsonPayload = {
    FIToFIPmtSts: {
      GrpHdr: { MsgId: 'msg_id', CreDtTm: '2023-02-03T09:53:58.069Z' },
      TxInfAndSts: { OrgnlEndToEndId: 'e2e-1', TxSts: 'ACCC' },
    },
  };

  const jsonSchema = {
    type: 'object',
    properties: {
      FIToFIPmtSts: {
        type: 'object',
        properties: {
          GrpHdr: {
            type: 'object',
            properties: {
              MsgId: { type: 'string' },
              CreDtTm: { type: 'string' },
            },
            required: ['MsgId', 'CreDtTm'],
          },
          TxInfAndSts: {
            type: 'object',
            properties: {
              OrgnlEndToEndId: { type: 'string' },
              TxSts: { type: 'string' },
            },
            required: ['OrgnlEndToEndId', 'TxSts'],
          },
        },
        required: ['GrpHdr', 'TxInfAndSts'],
      },
    },
    required: ['FIToFIPmtSts'],
  };

  describe('JSON', () => {
    it('config accepted at creation passes simulation stage 3 with the same payload', async () => {
      const created = await createConfig(
        jsonPayload,
        jsonSchema,
        ContentType.JSON,
      );
      expect(created.success).toBe(true);

      const result = await simulate(
        created.config!.id,
        jsonPayload,
        'application/json',
      );

      expect(schemaStage(result)?.status).toBe('PASSED');
      expect(result.status).toBe('PASSED');
    });

    it('accepts the payload as a JSON string at both stages', async () => {
      const raw = JSON.stringify(jsonPayload);
      const created = await createConfig(raw, jsonSchema, ContentType.JSON);
      expect(created.success).toBe(true);

      const result = await simulate(
        created.config!.id,
        raw,
        'application/json',
      );
      expect(schemaStage(result)?.status).toBe('PASSED');
    });

    it('rejects the mismatched schema from the issue and persists nothing', async () => {
      const created = await createConfig(
        jsonPayload,
        {
          type: 'object',
          properties: { CompletelyDifferentField: { type: 'string' } },
        },
        ContentType.JSON,
      );

      expect(created.success).toBe(false);
      expect(created.message).toMatch(/^Schema does not match payload: /);
      expect(store.size).toBe(0);
    });

    // enforceStrictSchema sets additionalProperties: true, so both entry
    // points tolerate extra fields and only enforce `required` and types.
    it('both entry points accept a payload with extra fields', async () => {
      const created = await createConfig(
        jsonPayload,
        jsonSchema,
        ContentType.JSON,
      );
      expect(created.success).toBe(true);

      const extended = {
        FIToFIPmtSts: {
          ...jsonPayload.FIToFIPmtSts,
          UnexpectedBlock: { Foo: 'bar' },
        },
      };

      const result = await simulate(
        created.config!.id,
        extended,
        'application/json',
      );
      expect(schemaStage(result)?.status).toBe('PASSED');
      expect(
        (await createConfig(extended, jsonSchema, ContentType.JSON)).success,
      ).toBe(true);
    });

    it('both entry points reject a payload missing a required field or with a wrong type', async () => {
      const created = await createConfig(
        jsonPayload,
        jsonSchema,
        ContentType.JSON,
      );
      expect(created.success).toBe(true);

      const missingRequired = {
        FIToFIPmtSts: { GrpHdr: jsonPayload.FIToFIPmtSts.GrpHdr },
      };
      const wrongType = {
        FIToFIPmtSts: {
          ...jsonPayload.FIToFIPmtSts,
          GrpHdr: { MsgId: 42, CreDtTm: '2023-02-03T09:53:58.069Z' },
        },
      };

      for (const drifted of [missingRequired, wrongType]) {
        const result = await simulate(
          created.config!.id,
          drifted,
          'application/json',
        );
        expect(schemaStage(result)?.status).toBe('FAILED');
        expect(
          (await createConfig(drifted, jsonSchema, ContentType.JSON)).success,
        ).toBe(false);
      }
      expect(store.size).toBe(1);
    });
  });

  // ----------------------------------------------------------------- XML

  // Limited to string leaves without attributes: the backend's xml2js parse
  // yields numeric text as strings and moves the text of an attributed element
  // to `textContent`, so frontend schemas typing leaves as `number` or
  // requiring `#text` do not round-trip yet.
  const xmlPayload = `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12">
  <FIToFIPmtSts>
    <GrpHdr>
      <MsgId>msg_id</MsgId>
      <CreDtTm>2023-02-03T09:53:58.069Z</CreDtTm>
    </GrpHdr>
    <TxInfAndSts>
      <OrgnlEndToEndId>e2e-1</OrgnlEndToEndId>
      <TxSts>ACCC</TxSts>
    </TxInfAndSts>
  </FIToFIPmtSts>
</Document>`;

  // Shape the frontend generator produces for XML: attributes such as xmlns
  // become plain properties, which cleanSchemaForXML strips.
  const xmlSchema = {
    type: 'object',
    properties: {
      Document: {
        type: 'object',
        properties: {
          xmlns: { type: 'string' },
          FIToFIPmtSts: {
            type: 'object',
            properties: {
              GrpHdr: {
                type: 'object',
                properties: {
                  MsgId: { type: 'string' },
                  CreDtTm: { type: 'string' },
                },
                required: ['MsgId', 'CreDtTm'],
              },
              TxInfAndSts: {
                type: 'object',
                properties: {
                  OrgnlEndToEndId: { type: 'string' },
                  TxSts: { type: 'string' },
                },
                required: ['OrgnlEndToEndId', 'TxSts'],
              },
            },
            required: ['GrpHdr', 'TxInfAndSts'],
          },
        },
        required: ['xmlns', 'FIToFIPmtSts'],
      },
    },
    required: ['Document'],
  };

  describe('XML', () => {
    it('config accepted at creation passes simulation stage 3 with the same payload', async () => {
      const created = await createConfig(
        xmlPayload,
        xmlSchema,
        ContentType.XML,
      );
      expect(created.message).toBe('Config created successfully');

      const result = await simulate(
        created.config!.id,
        xmlPayload,
        'application/xml',
      );

      expect(schemaStage(result)?.status).toBe('PASSED');
      expect(result.status).toBe('PASSED');
    });

    it('rejects an XML payload missing a field the schema requires and persists nothing', async () => {
      const created = await createConfig(
        xmlPayload,
        {
          type: 'object',
          properties: {
            Document: {
              type: 'object',
              properties: {
                CompletelyDifferentField: { type: 'string' },
              },
              required: ['CompletelyDifferentField'],
            },
          },
          required: ['Document'],
        },
        ContentType.XML,
      );

      expect(created.success).toBe(false);
      expect(created.message).toMatch(/^Schema does not match payload: /);
      expect(store.size).toBe(0);
    });

    it('rejects malformed XML at creation and persists nothing', async () => {
      const created = await createConfig(
        '<Document><Unclosed></Document>',
        xmlSchema,
        ContentType.XML,
      );

      expect(created.success).toBe(false);
      expect(store.size).toBe(0);
    });

    it('both entry points reject an XML payload missing a required element', async () => {
      const created = await createConfig(
        xmlPayload,
        xmlSchema,
        ContentType.XML,
      );
      expect(created.success).toBe(true);

      const drifted = xmlPayload.replace('<TxSts>ACCC</TxSts>', '');

      const result = await simulate(
        created.config!.id,
        drifted,
        'application/xml',
      );
      expect(schemaStage(result)?.status).toBe('FAILED');
      expect(
        (await createConfig(drifted, xmlSchema, ContentType.XML)).success,
      ).toBe(false);
    });
  });
});
