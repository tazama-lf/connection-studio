exports.up = function(knex) {
  return knex.schema.createTable('schema_versions', function(table) {
    table.increments('id').primary();
    table.integer('endpoint_id').references('id').inTable('endpoints').onDelete('CASCADE');
    table.integer('version').notNullable();
    table.jsonb('schema_definition').notNullable();
    table.string('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('schema_versions');
};
