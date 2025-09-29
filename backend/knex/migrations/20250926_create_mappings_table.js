/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('mappings', function(table) {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.integer('version').notNullable().defaultTo(1);
    table.enum('status', ['IN_PROGRESS', 'APPROVED', 'PUBLISHED']).defaultTo('IN_PROGRESS');
    table.jsonb('source_fields').notNullable();
    table.jsonb('destination_fields').notNullable();
    table.enum('transformation', ['NONE', 'CONCAT', 'SUM', 'SPLIT']).defaultTo('NONE');
    table.jsonb('constants').nullable();
    table.string('created_by', 255).notNullable();
    table.timestamps(true, true);
    
    // Unique constraint for name + version
    table.unique(['name', 'version']);
    
    // Indexes for performance
    table.index(['name']);
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
  return knex.schema.dropTable('mappings');
};