/**
 * Migration to drop the unused simulation_logs table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.dropTableIfExists('simulation_logs');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Recreate the table if rollback is needed (basic structure)
  return knex.schema.createTable('simulation_logs', function(table) {
    table.increments('id').primary();
    table.text('details').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};