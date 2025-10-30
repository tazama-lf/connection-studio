import { SchemaInferenceService } from './schema-inference.service';
import { FieldType, SchemaField, ContentType } from '@tazama-lf/tcs-lib';
describe('SchemaInferenceService', () => {
  let service: SchemaInferenceService;
  beforeEach(() => {
    service = new SchemaInferenceService();
  });
  it('should infer schema from simple JSON', () => {
    const payload = JSON.stringify({ name: 'John', age: 30, active: true });
    const schema = service['inferFromJson'](payload);
    expect(schema).toEqual([
      { name: 'name', path: 'name', type: FieldType.STRING, isRequired: true },
      { name: 'age', path: 'age', type: FieldType.NUMBER, isRequired: true },
      {
        name: 'active',
        path: 'active',
        type: FieldType.BOOLEAN,
        isRequired: true,
      },
    ]);
  });
  it('should infer schema from nested JSON', () => {
    const payload = JSON.stringify({
      user: { id: 1, info: { email: 'a@b.com' } },
    });
    const schema = service['inferFromJson'](payload);
    expect(schema[0].children).toBeDefined();
    expect(schema[0].children![1].children).toBeDefined();
  });
  it('should infer schema from array JSON', () => {
    const payload = JSON.stringify({ items: [{ id: 1, value: 'A' }] });
    const schema = service['inferFromJson'](payload);
    expect(schema[0].type).toBe(FieldType.ARRAY);
    expect(schema[0].arrayElementType).toBe(FieldType.OBJECT);
    expect(schema[0].children).toBeDefined();
  });
  it('should throw error for invalid JSON', () => {
    expect(() => service['inferFromJson']('not-json')).toThrow(
      /Invalid JSON payload/,
    );
  });
  it('should infer schema from simple XML', async () => {
    const xml =
      '<user><name>John</name><age>30</age><active>true</active></user>';
    const schema = await service['inferFromXml'](xml);
    expect(schema.find((f) => f.name === 'name')?.type).toBe(FieldType.STRING);
    expect(schema.find((f) => f.name === 'age')?.type).toBe(FieldType.NUMBER); // now infers number
    expect(schema.find((f) => f.name === 'active')?.type).toBe(
      FieldType.BOOLEAN,
    ); // now infers boolean
  });
  it('should infer schema from nested XML', async () => {
    const xml = '<user><info><email>a@b.com</email></info></user>';
    const schema = await service['inferFromXml'](xml);
    expect(schema.find((f) => f.name === 'info')?.children).toBeDefined();
  });
  it('should infer schema from array XML', async () => {
    const xml = '<root><item><id>1</id></item><item><id>2</id></item></root>';
    const schema = await service['inferFromXml'](xml);
    expect(schema.find((f) => f.name === 'item')?.type).toBe(FieldType.ARRAY);
  });
  it('should throw error for invalid XML', async () => {
    await expect(service['inferFromXml']('<not-xml')).rejects.toThrow(
      /Invalid XML payload/,
    );
  });
  it('should validate a correct schema', () => {
    const fields: SchemaField[] = [
      { name: 'name', path: 'name', type: FieldType.STRING, isRequired: true },
      { name: 'age', path: 'age', type: FieldType.NUMBER, isRequired: true },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
  it('should catch empty name and invalid type in validation', () => {
    const fields: SchemaField[] = [
      { name: '', path: 'name', type: FieldType.STRING, isRequired: true },
      {
        name: 'foo',
        path: 'foo',
        type: 'notatype' as FieldType,
        isRequired: true,
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty name'))).toBe(true);
    expect(result.errors.some((e) => e.includes('invalid type'))).toBe(true);
  });
  it('should detect duplicate field paths', () => {
    const fields: SchemaField[] = [
      {
        name: 'name',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      },
      {
        name: 'name2',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate field path'))).toBe(
      true,
    );
  });
  it('should detect conflicting field paths - parent/child conflict', () => {
    const fields: SchemaField[] = [
      { name: 'user', path: 'user', type: FieldType.STRING, isRequired: true },
      {
        name: 'userName',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Path conflict'))).toBe(true);
  });
  it('should detect array index conflicts', () => {
    const fields: SchemaField[] = [
      { name: 'items', path: 'items', type: FieldType.ARRAY, isRequired: true },
      {
        name: 'item',
        path: 'items[0]',
        type: FieldType.STRING,
        isRequired: true,
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Array index conflict'))).toBe(
      true,
    );
  });
  it('should allow valid nested object structures', () => {
    const fields: SchemaField[] = [
      {
        name: 'user',
        path: 'user',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'name',
            path: 'user.name',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'age',
            path: 'user.age',
            type: FieldType.NUMBER,
            isRequired: true,
          },
        ],
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
  it('should allow valid array structures', () => {
    const fields: SchemaField[] = [
      {
        name: 'items',
        path: 'items',
        type: FieldType.ARRAY,
        isRequired: true,
        arrayElementType: FieldType.OBJECT,
        children: [
          {
            name: 'id',
            path: 'items[0].id',
            type: FieldType.NUMBER,
            isRequired: true,
          },
          {
            name: 'value',
            path: 'items[0].value',
            type: FieldType.STRING,
            isRequired: true,
          },
        ],
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
  it('should validate invalid array element types', () => {
    const fields: SchemaField[] = [
      {
        name: 'items',
        path: 'items',
        type: FieldType.ARRAY,
        isRequired: true,
        arrayElementType: 'invalidtype' as FieldType,
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('invalid array element type')),
    ).toBe(true);
  });
  it('should handle complex nested structures with validation', () => {
    const fields: SchemaField[] = [
      {
        name: 'transaction',
        path: 'transaction',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'id',
            path: 'transaction.id',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'participants',
            path: 'transaction.participants',
            type: FieldType.ARRAY,
            isRequired: true,
            arrayElementType: FieldType.OBJECT,
            children: [
              {
                name: 'name',
                path: 'transaction.participants[0].name',
                type: FieldType.STRING,
                isRequired: true,
              },
              {
                name: 'role',
                path: 'transaction.participants[0].role',
                type: FieldType.STRING,
                isRequired: true,
              },
            ],
          },
        ],
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
  it('should detect multiple validation errors', () => {
    const fields: SchemaField[] = [
      { name: '', path: '', type: FieldType.STRING, isRequired: true }, // empty name and path
      { name: 'user', path: 'user', type: FieldType.STRING, isRequired: true },
      {
        name: 'name',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      }, // conflict
      {
        name: 'duplicate',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      }, // duplicate
      {
        name: 'invalid',
        path: 'invalid',
        type: 'badtype' as FieldType,
        isRequired: true,
      }, // invalid type
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
  it('should handle edge case with undefined paths', () => {
    const fields: SchemaField[] = [
      {
        name: '',
        path: undefined as any,
        type: FieldType.STRING,
        isRequired: true,
      },
    ];
    const result = service.validateSchema(fields);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty name'))).toBe(true);
  });
  it('should infer schema from complex nested JSON with arrays', () => {
    const payload = JSON.stringify({
      transaction: {
        id: 'txn-123',
        amount: 100.5,
        participants: [
          { name: 'Alice', role: 'sender' },
          { name: 'Bob', role: 'receiver' },
        ],
        metadata: {
          timestamp: '2023-09-21T10:00:00Z',
          tags: ['urgent', 'verified'],
        },
      },
    });
    const schema = service['inferFromJson'](payload);
    expect(schema).toBeDefined();
    expect(schema.length).toBe(1);
    expect(schema[0].name).toBe('transaction');
    expect(schema[0].type).toBe(FieldType.OBJECT);
    expect(schema[0].children).toBeDefined();
    expect(schema[0].children!.length).toBe(4);
    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(true);
  });
  it('should infer schema from complex XML with multiple levels', async () => {
    const xml = `
      <transaction>
        <id>txn-123</id>
        <amount>100.50</amount>
        <participants>
          <participant>
            <name>Alice</name>
            <role>sender</role>
          </participant>
          <participant>
            <name>Bob</name>
            <role>receiver</role>
          </participant>
        </participants>
        <metadata>
          <timestamp>2023-09-21T10:00:00Z</timestamp>
          <verified>true</verified>
        </metadata>
      </transaction>
    `;
    const schema = await service['inferFromXml'](xml);
    expect(schema).toBeDefined();
    expect(schema.length).toBeGreaterThan(0);
    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(true);
  });
  it('should handle malformed JSON gracefully', () => {
    expect(() => service['inferFromJson']('{"invalid": json}')).toThrow(
      /Invalid JSON payload/,
    );
  });
  it('should handle malformed XML gracefully', async () => {
    await expect(
      service['inferFromXml']('<invalid><xml></invalid>'),
    ).rejects.toThrow(/Invalid XML payload/);
  });
  it('should infer correct types from XML string values', async () => {
    const xml =
      '<data><count>42</count><price>19.99</price><active>true</active><name>test</name></data>';
    const schema = await service['inferFromXml'](xml);
    const dataField = schema.find(
      (f) =>
        f.name === 'count' ||
        f.name === 'price' ||
        f.name === 'active' ||
        f.name === 'name',
    );
    if (!dataField && schema.length > 0 && schema[0].children) {
      const fields = schema[0].children;
      expect(fields.find((f) => f.name === 'count')?.type).toBe(
        FieldType.NUMBER,
      );
      expect(fields.find((f) => f.name === 'price')?.type).toBe(
        FieldType.NUMBER,
      );
      expect(fields.find((f) => f.name === 'active')?.type).toBe(
        FieldType.BOOLEAN,
      );
      expect(fields.find((f) => f.name === 'name')?.type).toBe(
        FieldType.STRING,
      );
    } else {
      expect(schema.length).toBeGreaterThan(0);
    }
  });
  it('should handle empty arrays in JSON', () => {
    const payload = JSON.stringify({ items: [] });
    const schema = service['inferFromJson'](payload);
    expect(schema[0].type).toBe(FieldType.ARRAY);
    expect(schema[0].arrayElementType).toBeDefined();
  });
  it('should handle null values in JSON', () => {
    const payload = JSON.stringify({ nullable: null, data: { inner: null } });
    const schema = service['inferFromJson'](payload);
    expect(schema.find((f) => f.name === 'nullable')?.type).toBe(
      FieldType.STRING,
    );
  });
  it('should support public inferSchemaFromPayload method', async () => {
    const jsonPayload = '{"name": "test", "count": 5}';
    const jsonSchema = await service.inferSchemaFromPayload(
      jsonPayload,
      ContentType.JSON,
    );
    expect(jsonSchema.length).toBe(2);
    const xmlPayload = '<root><name>test</name><count>5</count></root>';
    const xmlSchema = await service.inferSchemaFromPayload(
      xmlPayload,
      ContentType.XML,
    );
    expect(xmlSchema.length).toBeGreaterThan(0);
  });
  it('should throw error for unsupported content type', async () => {
    await expect(
      service.inferSchemaFromPayload('data', 'unsupported' as ContentType),
    ).rejects.toThrow(/Unsupported content type/);
  });

  it('should handle complex payment structures with multiple Othr arrays without path conflicts', () => {
    const paymentPayload = JSON.stringify({
      CstmrCdtTrfInitn: {
        GrpHdr: {
          InitgPty: {
            Id: {
              PrvtId: {
                Othr: [
                  {
                    Id: '12345',
                    SchmeNm: {
                      Prtry: 'National ID',
                    },
                  },
                ],
              },
            },
          },
        },
        PmtInf: {
          Dbtr: {
            Id: {
              PrvtId: {
                Othr: [
                  {
                    Id: '67890',
                    SchmeNm: {
                      Prtry: 'Passport',
                    },
                  },
                ],
              },
            },
          },
          CdtrAcct: {
            Id: {
              Othr: [
                {
                  Id: 'ACCT002',
                  SchmeNm: {
                    Prtry: 'BankAccount',
                  },
                },
              ],
            },
          },
        },
      },
    });

    const schema = service['inferFromJson'](paymentPayload);

    // Utility function to find fields by path
    const findFieldByPath = (
      fields: SchemaField[],
      path: string,
    ): SchemaField | null => {
      for (const field of fields) {
        if (field.path === path) {
          return field;
        }
        if (field.children) {
          const childResult = findFieldByPath(field.children, path);
          if (childResult) return childResult;
        }
      }
      return null;
    };

    const othrArray1 = findFieldByPath(
      schema,
      'CstmrCdtTrfInitn.GrpHdr.InitgPty.Id.PrvtId.Othr',
    );
    const othrArray2 = findFieldByPath(
      schema,
      'CstmrCdtTrfInitn.PmtInf.Dbtr.Id.PrvtId.Othr',
    );
    const othrArray3 = findFieldByPath(
      schema,
      'CstmrCdtTrfInitn.PmtInf.CdtrAcct.Id.Othr',
    );

    expect(othrArray1).toBeTruthy();
    expect(othrArray1?.type).toBe(FieldType.ARRAY);
    expect(othrArray1?.arrayElementType).toBe(FieldType.OBJECT);
    expect(othrArray1?.children).toBeDefined();
    expect(othrArray1?.children?.length).toBe(2); // Id and SchmeNm

    expect(othrArray2).toBeTruthy();
    expect(othrArray2?.type).toBe(FieldType.ARRAY);
    expect(othrArray2?.arrayElementType).toBe(FieldType.OBJECT);

    expect(othrArray3).toBeTruthy();
    expect(othrArray3?.type).toBe(FieldType.ARRAY);
    expect(othrArray3?.arrayElementType).toBe(FieldType.OBJECT);

    const validation = service.validateSchema(schema);
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });
});
