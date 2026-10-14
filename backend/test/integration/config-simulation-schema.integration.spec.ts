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
import { SchemaValidationService } from '../../src/schemaValidation/schema-validation.service';
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

    // enforceStrictSchema closes every object (additionalProperties: false),
    // so a field the schema does not describe is rejected at both entry points.
    it('both entry points reject a payload with a field the schema does not describe', async () => {
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
      expect(schemaStage(result)?.status).toBe('FAILED');
      expect(JSON.stringify(schemaStage(result)?.errors)).toContain(
        "must NOT have additional properties 'UnexpectedBlock'",
      );

      const creationVerdict = await createConfig(
        extended,
        jsonSchema,
        ContentType.JSON,
      );
      expect(creationVerdict.success).toBe(false);
      expect(creationVerdict.message).toContain(
        "/FIToFIPmtSts: must NOT have additional properties 'UnexpectedBlock'",
      );
      expect(store.size).toBe(1);
    });

    it('rejects a payload field missing from a minimal schema, naming the field', async () => {
      const created = await createConfig(
        { name: 'John', age: 25 },
        { type: 'object', properties: { name: { type: 'string' } } },
        ContentType.JSON,
      );

      expect(created.success).toBe(false);
      expect(created.message).toBe(
        "Schema does not match payload: root: must NOT have additional properties 'age'",
      );
      expect(store.size).toBe(0);
    });

    it('rejects a schema that declares no type', async () => {
      const created = await createConfig(jsonPayload, {}, ContentType.JSON);

      expect(created.success).toBe(false);
      expect(created.message).toBe(
        'Schema does not match payload: schema: Schema must declare a type',
      );
      expect(store.size).toBe(0);
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

  // Covers an attribute+text element (StsRsnInf), whose text the frontend
  // schema declares as '#text'. Numeric leaves are left out: xml2js yields
  // text as strings, so frontend schemas typing them `number` do not
  // round-trip yet.
  const xmlPayload = `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12">
  <FIToFIPmtSts>
    <GrpHdr>
      <MsgId>msg_id</MsgId>
      <CreDtTm>2023-02-03T09:53:58.069Z</CreDtTm>
    </GrpHdr>
    <TxInfAndSts>
      <OrgnlEndToEndId>e2e-1</OrgnlEndToEndId>
      <TxSts>ACCC</TxSts>
      <StsRsnInf Cd="AC01">Incorrect account</StsRsnInf>
    </TxInfAndSts>
  </FIToFIPmtSts>
</Document>`;

  // Shape the frontend generator produces for XML: attributes become plain
  // properties (xmlns is stripped by cleanSchemaForXML), element text '#text'.
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
                  StsRsnInf: {
                    type: 'object',
                    properties: {
                      Cd: { type: 'string' },
                      '#text': { type: 'string' },
                    },
                    required: ['Cd', '#text'],
                  },
                },
                required: ['OrgnlEndToEndId', 'TxSts', 'StsRsnInf'],
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

    it('both entry points reject an XML payload with an element the schema does not describe', async () => {
      const created = await createConfig(
        xmlPayload,
        xmlSchema,
        ContentType.XML,
      );
      expect(created.success).toBe(true);

      const extended = xmlPayload.replace(
        '<TxSts>ACCC</TxSts>',
        '<TxSts>ACCC</TxSts><Unexpected>x</Unexpected>',
      );

      const result = await simulate(
        created.config!.id,
        extended,
        'application/xml',
      );
      expect(schemaStage(result)?.status).toBe('FAILED');

      const creationVerdict = await createConfig(
        extended,
        xmlSchema,
        ContentType.XML,
      );
      expect(creationVerdict.success).toBe(false);
      expect(creationVerdict.message).toContain(
        "must NOT have additional properties 'Unexpected'",
      );
    });

    it('rejects an XML payload whose root the schema does not describe (TCS-ISSUE-007)', async () => {
      const created = await createConfig(
        '<root><name>John</name></root>',
        {
          type: 'object',
          required: ['DifferentRoot'],
          additionalProperties: false,
          properties: { DifferentRoot: { type: 'object' } },
        },
        ContentType.XML,
      );

      expect(created.success).toBe(false);
      expect(created.message).toContain(
        "must NOT have additional properties 'root'",
      );
      expect(store.size).toBe(0);
    });
  });

  // XML-only clean-up (root wrapping, @/xmlns stripping, schema cleaning)
  // must not apply to JSON payloads.
  describe('XML rules are not applied to JSON', () => {
    const grpHdrSchema = {
      type: 'object',
      required: ['MsgId'],
      properties: { MsgId: { type: 'string' } },
    };

    it('rejects a JSON payload missing the single schema root instead of wrapping it', async () => {
      const created = await createConfig(
        { GrpHdr: { MsgId: 'x' } },
        {
          type: 'object',
          required: ['FIToFIPmtSts'],
          properties: {
            FIToFIPmtSts: {
              type: 'object',
              required: ['GrpHdr'],
              properties: { GrpHdr: grpHdrSchema },
            },
          },
        },
        ContentType.JSON,
      );

      expect(created.success).toBe(false);
      expect(created.message).toContain(
        "must have required property 'FIToFIPmtSts'",
      );
      expect(created.message).toContain(
        "must NOT have additional properties 'GrpHdr'",
      );
      expect(store.size).toBe(0);
    });

    it.each(['xmlns', 'xmlns:xsi', '@type', '$'])(
      'rejects an undeclared %s key in a JSON payload',
      async (key) => {
        const created = await createConfig(
          { GrpHdr: { MsgId: 'x' }, [key]: 'urn:x' },
          {
            type: 'object',
            required: ['GrpHdr'],
            properties: { GrpHdr: grpHdrSchema },
          },
          ContentType.JSON,
        );

        expect(created.success).toBe(false);
        expect(created.message).toContain(
          `must NOT have additional properties '${key}'`,
        );
        expect(store.size).toBe(0);
      },
    );

    it('accepts a JSON payload whose schema requires an @-prefixed key, at both entry points', async () => {
      const payload = { '@type': 'Foo', name: 'John' };
      const created = await createConfig(
        payload,
        {
          type: 'object',
          required: ['@type', 'name'],
          properties: {
            '@type': { type: 'string' },
            name: { type: 'string' },
          },
        },
        ContentType.JSON,
      );
      expect(created.success).toBe(true);

      const result = await simulate(
        created.config!.id,
        payload,
        'application/json',
      );
      expect(schemaStage(result)?.status).toBe('PASSED');
    });

    it('rejects a JSON payload that omits a required @-prefixed key', async () => {
      const created = await createConfig(
        { name: 'John' },
        {
          type: 'object',
          required: ['@type', 'name'],
          properties: {
            '@type': { type: 'string' },
            name: { type: 'string' },
          },
        },
        ContentType.JSON,
      );

      expect(created.success).toBe(false);
      expect(created.message).toContain("must have required property '@type'");
    });
  });

  describe('XML rules still apply to XML configs', () => {
    it('ignores a namespace declaration the schema does not describe', async () => {
      const created = await createConfig(
        '<root xmlns="urn:x"><name>John</name></root>',
        {
          type: 'object',
          required: ['root'],
          properties: {
            root: {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string' } },
            },
          },
        },
        ContentType.XML,
      );

      expect(created.success).toBe(true);
    });

    it('does not crash when an XML schema requires an @-prefixed key', async () => {
      const created = await createConfig(
        '<root><name>John</name></root>',
        {
          type: 'object',
          required: ['root'],
          properties: {
            root: {
              type: 'object',
              required: ['@id', 'name'],
              properties: {
                '@id': { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
        ContentType.XML,
      );

      expect(created.success).toBe(true);
    });

    it('applies XML rules in simulation when the UI sends the XML payload pre-converted to JSON', async () => {
      // Schema without the namespace: the UI payload below only passes if
      // simulation strips xmlns, i.e. XML rules come from the config's
      // content type rather than the request's payloadType.
      const schemaWithoutXmlns = structuredClone(xmlSchema) as any;
      delete schemaWithoutXmlns.properties.Document.properties.xmlns;
      schemaWithoutXmlns.properties.Document.required = ['FIToFIPmtSts'];

      const created = await createConfig(
        xmlPayload,
        schemaWithoutXmlns,
        ContentType.XML,
      );
      expect(created.success).toBe(true);

      // What SimulationPanel sends: fast-xml-parser output, payloadType json.
      const uiConverted = {
        Document: {
          xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12',
          FIToFIPmtSts: {
            GrpHdr: { MsgId: 'msg_id', CreDtTm: '2023-02-03T09:53:58.069Z' },
            TxInfAndSts: {
              OrgnlEndToEndId: 'e2e-1',
              TxSts: 'ACCC',
              StsRsnInf: { Cd: 'AC01', '#text': 'Incorrect account' },
            },
          },
        },
      };
      const result = await simulate(
        created.config!.id,
        uiConverted,
        'application/json',
      );

      expect(schemaStage(result)?.status).toBe('PASSED');
    });
  });
});
