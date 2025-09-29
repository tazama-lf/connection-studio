/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('data_model_extensions', function(table) {
    table.uuid('id').primary();
    table.string('collection', 255).notNullable();
    table.string('field_name', 255).notNullable();
    table.enum('field_type', ['STRING', 'NUMBER', 'BOOLEAN', 'DATE']).notNullable();
    table.boolean('is_required').defaultTo(false);
    table.text('default_value').nullable(); // JSON string
    table.integer('version').notNullable().defaultTo(1);
    table.enum('status', ['ACTIVE', 'INACTIVE', 'DEPRECATED']).defaultTo('ACTIVE');
    table.string('created_by', 255).notNullable();
    table.timestamps(true, true);
    
    // Unique constraint for collection + field_name + version
    table.unique(['collection', 'field_name', 'version']);
    
    // Indexes for performance
    table.index(['collection']);
    table.index(['collection', 'status']);
    table.index(['field_name']);
    table.index(['status']);
    table.index(['created_by']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('data_model_extensions');
};