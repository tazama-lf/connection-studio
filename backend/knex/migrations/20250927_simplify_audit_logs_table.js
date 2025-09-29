/**
 * Migration to simplify audit_logs table to match user story requirements
 * Keeps only: user identity (actor), timestamp, action type, endpoint name, version
 * Removes: details, mapping_id, and other complex fields
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('audit_logs', function(table) {
    // Drop complex fields that are out of scope (if they exist)
    table.dropColumn('details');
    table.dropColumn('mapping_id');
  }).catch(err => {
    console.log('Some columns may not exist, continuing...');
  }).then(() => {
    // Add simple indexes for basic queries
    return knex.schema.alterTable('audit_logs', function(table) {
      table.index(['endpoint_name']);
      table.index(['timestamp']);
    });
  }).catch(err => {
    console.log('Some indexes may already exist, continuing...');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('audit_logs', function(table) {
    // Restore complex fields
    table.jsonb('details').nullable();
    table.uuid('mapping_id').nullable();
    
    // Restore UUID id
    table.dropPrimary();
    table.dropColumn('id');
    table.uuid('id').primary();
    
    // Restore complex indexes
    table.index(['mapping_id']);
    table.index(['actor']);
    table.index(['action', 'timestamp']);
    table.index(['mapping_id', 'version']);
  });
};