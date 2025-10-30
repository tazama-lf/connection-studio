const RESERVED_KEYWORDS = new Set([
  'select',
  'insert',
  'update',
  'delete',
  'create',
  'drop',
  'table',
  'from',
  'where',
  'join',
  'user',
  'group',
  'order',
  'by',
  'limit',
]);

const uuidPattern =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export { RESERVED_KEYWORDS, uuidPattern };
