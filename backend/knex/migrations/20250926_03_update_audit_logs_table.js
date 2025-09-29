/**
 * Migration to enhance audit_logs table for comprehensive audit logging
 * Adds UUID id, mappingId, version, and actor fields
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('audit_logs', function(table) {
    // First, add new columns
    table.uuid('new_id');
    table.string('actor', 255);
    table.uuid('mapping_id').nullable();
    table.integer('version').nullable();
    
    // Add indexes for better performance
    table.index(['mapping_id']);
    table.index(['actor']);
    table.index(['action', 'timestamp']);
    table.index(['mapping_id', 'version']);
  }).then(() => {
    // Update existing records to have UUID ids and migrate editor_identity to actor
    return knex.raw(`
      UPDATE audit_logs 
      SET 
        new_id = gen_random_uuid(),
        actor = editor_identity
      WHERE new_id IS NULL
    `);
  }).then(() => {
    // Drop the old id column and rename new_id to id
    return knex.schema.alterTable('audit_logs', function(table) {
      table.dropPrimary();
      table.dropColumn('id');
    });
  }).then(() => {
    return knex.schema.alterTable('audit_logs', function(table) {
      table.renameColumn('new_id', 'id');
      table.primary('id');
    });
  }).then(() => {
    // Drop the old editor_identity column
    return knex.schema.alterTable('audit_logs', function(table) {
      table.dropColumn('editor_identity');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('audit_logs', function(table) {
    // Revert back to auto-increment id
    table.dropPrimary();
    table.dropColumn('id');
    table.increments('id').primary();
    
    // Restore editor_identity column
    table.string('editor_identity').notNullable();
    
    // Drop new columns
    table.dropColumn('actor');
    table.dropColumn('mapping_id');
    table.dropColumn('version');
  }).then(() => {
    // Migrate actor back to editor_identity
    return knex.raw(`
      UPDATE audit_logs 
      SET editor_identity = actor 
      WHERE editor_identity IS NULL
    `);
  });
};