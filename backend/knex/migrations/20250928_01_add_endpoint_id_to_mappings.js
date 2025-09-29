/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('mappings', function(table) {
    // Add endpoint_id column with foreign key constraint
    table.integer('endpoint_id').unsigned().nullable();
    table.foreign('endpoint_id').references('id').inTable('endpoints').onDelete('SET NULL');
    
    // Add index for performance
    table.index(['endpoint_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('mappings', function(table) {
    table.dropForeign('endpoint_id');
    table.dropIndex(['endpoint_id']);
    table.dropColumn('endpoint_id');
  });
};