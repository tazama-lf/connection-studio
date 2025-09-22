exports.up = function(knex) {
  return knex.schema.createTable('schema_fields', function(table) {
    table.increments('id').primary();
    table.integer('schema_version_id').references('id').inTable('schema_versions').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('path').notNullable();
    table.enu('type', ['string', 'number', 'boolean', 'object', 'array']).notNullable();
    table.boolean('is_required').defaultTo(false);
    table.integer('parent_field_id').references('id').inTable('schema_fields').onDelete('CASCADE').nullable();
    table.string('array_element_type').nullable();
    table.jsonb('validation_rules').nullable();
    table.integer('field_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Add indexes for better performance
    table.index(['schema_version_id']);
    table.index(['parent_field_id']);
    table.index(['path']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('schema_fields');
};