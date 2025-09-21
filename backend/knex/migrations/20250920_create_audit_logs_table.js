exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', function(table) {
    table.increments('id').primary();
    table.string('action').notNullable();
    table.string('editor_identity').notNullable();
    table.string('endpoint_name').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.jsonb('details').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('audit_logs');
};
