/**
 * Migration: Create unified config table
 * Replaces all previous endpoint/schema/mapping tables with single config table
 */

exports.up = function (knex) {
  return knex.schema.hasTable('config').then(function(exists) {
    if (!exists) {
      return knex.schema.createTable('config', (table) => {
        // Primary key
        table.increments('id').primary();

        // Core fields
        table.string('msg_fam').notNullable().comment('Message family (e.g., pain.001, pacs.008)');
        table.string('transaction_type').notNullable().comment('Transaction type (Payments, Transfers)');
        table.string('endpoint_path').notNullable().comment('API endpoint path');
        table.string('version').notNullable().defaultTo('v1').comment('API version');
        table.string('content_type').notNullable().defaultTo('application/json').comment('Content type (JSON/XML)');

        // Schema storage (JSON Schema format)
        table.jsonb('schema').notNullable().comment('JSON Schema defining the data structure');

        // Mapping storage (source-to-destination field mappings with concat support)
        table.jsonb('mapping').nullable().comment('Field mappings: [{S,D}, {{S,S},D}] format for concat');

        // Multi-tenancy
        table.string('tenant_id').notNullable().comment('Tenant identifier for multi-tenancy');

        // Metadata
        table.string('created_by').notNullable().comment('User who created this config');
        table.timestamps(true, true); // created_at, updated_at

        // Indexes
        table.index(['tenant_id'], 'idx_config_tenant');
        table.index(['transaction_type'], 'idx_config_transaction_type');
        table.index(['endpoint_path', 'version', 'tenant_id'], 'idx_config_endpoint_lookup');
        table.unique(['msg_fam', 'transaction_type', 'endpoint_path', 'version', 'tenant_id'], 'uq_config_unique');
      });
    }
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('config');
};
