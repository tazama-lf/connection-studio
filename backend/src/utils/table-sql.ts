export interface ColumnDef {
  name: string;
  type: string;
  isPrimaryKey?: boolean | string;
  param: string;
}

export function createTableSQL( table: string, cols: ColumnDef[]): string {
  const tname = table;

  const defs = cols.map((c: ColumnDef) => `"${c.name}" ${c.type}`);

  const pks = cols.filter((c: ColumnDef) => c.isPrimaryKey === true || c.isPrimaryKey === 'true').map((c: ColumnDef) => `"${c.name}"`);

  const pk = pks.length ? `, PRIMARY KEY (${pks.join(',')})` : '';

  return `CREATE TABLE IF NOT EXISTS "${tname}" (
    ${defs.join(',')}
    ${pk}
  );`;
}