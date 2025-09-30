/**
 * Migration to add tenant_id column to all tables for multitenancy support
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Add tenant_id to mappings table
    await trx.schema.alterTable('mappings', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
      table.index(['tenant_id', 'name']);
      table.index(['tenant_id', 'status']);
    });

    // Add tenant_id to endpoints table
    await trx.schema.alterTable('endpoints', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
      table.index(['tenant_id', 'status']);
    });

    // Add tenant_id to audit_logs table
    await trx.schema.alterTable('audit_logs', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
      table.index(['tenant_id', 'timestamp']);
    });

    // Add tenant_id to schema_versions table
    await trx.schema.alterTable('schema_versions', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
      table.index(['tenant_id', 'endpoint_id']);
    });

    // Add tenant_id to schema_fields table  
    await trx.schema.alterTable('schema_fields', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
    });

    // Add tenant_id to data_model_extensions table
    await trx.schema.alterTable('data_model_extensions', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
      table.index(['tenant_id', 'mapping_id']);
    });

    // Add tenant_id to data_model_extension_audit_logs table
    await trx.schema.alterTable('data_model_extension_audit_logs', function(table) {
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.index(['tenant_id']);
      table.index(['tenant_id', 'timestamp']);
    });

    console.log('✅ Successfully added tenant_id columns to all tables');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Remove tenant_id from all tables
    await trx.schema.alterTable('mappings', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropIndex(['tenant_id', 'name']);
      table.dropIndex(['tenant_id', 'status']);
      table.dropColumn('tenant_id');
    });

    await trx.schema.alterTable('endpoints', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropIndex(['tenant_id', 'status']);
      table.dropColumn('tenant_id');
    });

    await trx.schema.alterTable('audit_logs', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropIndex(['tenant_id', 'timestamp']);
      table.dropColumn('tenant_id');
    });

    await trx.schema.alterTable('schema_versions', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropIndex(['tenant_id', 'endpoint_id']);
      table.dropColumn('tenant_id');
    });

    await trx.schema.alterTable('schema_fields', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropColumn('tenant_id');
    });

    await trx.schema.alterTable('data_model_extensions', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropIndex(['tenant_id', 'mapping_id']);
      table.dropColumn('tenant_id');
    });

    await trx.schema.alterTable('data_model_extension_audit_logs', function(table) {
      table.dropIndex(['tenant_id']);
      table.dropIndex(['tenant_id', 'timestamp']);
      table.dropColumn('tenant_id');
    });

    console.log('✅ Successfully removed tenant_id columns from all tables');
  });
};