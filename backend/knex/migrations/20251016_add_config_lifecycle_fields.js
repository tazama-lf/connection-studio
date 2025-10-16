/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('config', function(table) {
    // Add approval and lifecycle fields
    table.boolean('is_approved').defaultTo(false).notNullable();
    table.string('process_instance_id', 100).nullable();
    table.string('approved_by', 255).nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('deployed_at').nullable();
    
    // Add index for lifecycle queries
    table.index(['version', 'transaction_type', 'tenant_id'], 'idx_config_version_transaction_tenant');
    table.index(['process_instance_id'], 'idx_config_process_instance');
    table.index(['is_approved', 'status'], 'idx_config_approval_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('config', function(table) {
    // Drop indexes
    table.dropIndex(['version', 'transaction_type', 'tenant_id'], 'idx_config_version_transaction_tenant');
    table.dropIndex(['process_instance_id'], 'idx_config_process_instance');
    table.dropIndex(['is_approved', 'status'], 'idx_config_approval_status');
    
    // Drop columns
    table.dropColumn('is_approved');
    table.dropColumn('process_instance_id');
    table.dropColumn('approved_by');
    table.dropColumn('approved_at');
    table.dropColumn('deployed_at');
  });
};