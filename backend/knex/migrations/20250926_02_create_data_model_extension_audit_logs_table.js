/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('data_model_extension_audit_logs', function(table) {
    table.uuid('id').primary();
    table.uuid('extension_id').notNullable();
    table.enum('action', ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE']).notNullable();
    table.string('user_id', 255).notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.text('previous_state').nullable(); // JSON string
    table.text('new_state').nullable(); // JSON string
    table.text('details').nullable();
    table.timestamps(true, true);
    
    // Foreign key constraint
    table.foreign('extension_id').references('id').inTable('data_model_extensions').onDelete('CASCADE');
    
    // Indexes for performance and querying
    table.index(['extension_id', 'action']);
    table.index(['user_id', 'timestamp']);
    table.index(['action', 'timestamp']);
    table.index(['timestamp']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('data_model_extension_audit_logs');
};