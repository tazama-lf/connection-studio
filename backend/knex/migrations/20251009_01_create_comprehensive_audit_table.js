/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', function(table) {
    table.uuid('id').primary();
    table.string('action', 100).notNullable().index();
    table.string('entity_type', 50).notNullable().index();
    table.string('entity_id', 100).nullable().index();
    table.string('actor', 255).notNullable().index();
    table.string('tenant_id', 100).notNullable().index();
    table.string('endpoint_name', 255).nullable();
    table.string('mapping_name', 255).nullable();
    table.integer('version').nullable();
    table.text('details').nullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.string('session_id', 255).nullable();
    table.enum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('MEDIUM');
    table.enum('status', ['SUCCESS', 'FAILURE', 'PENDING']).defaultTo('SUCCESS');
    table.string('error_message', 1000).nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'timestamp']);
    table.index(['entity_type', 'entity_id']);
    table.index(['action', 'timestamp']);
    table.index(['actor', 'timestamp']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('audit_logs');
};