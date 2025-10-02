/**
 * Migration to create a multi-field mappings table storing arrays of source and destination fields
 * This implements User Story #301 – Field Mapping and Data Transformation
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Creating multi-field mappings table for array-based field mappings...');
  
  await knex.schema.createTable('multi_field_mappings', function(table) {
    table.increments('id').primary();
    
    // Link to endpoint (source schema)
    table.integer('endpoint_id').unsigned().notNullable();
    table.foreign('endpoint_id').references('id').inTable('endpoints').onDelete('CASCADE');
    
    // Mapping name and description
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    
    // Source fields - JSON array of objects { path, type, isRequired }
    table.jsonb('source_fields').notNullable();
    
    // Destination fields - JSON array of objects { path, type, isRequired, isExtension }
    table.jsonb('destination_fields').notNullable();
    
    // Transformation configuration
    table.enum('transformation', ['NONE', 'CONCAT', 'SUM', 'SPLIT']).notNullable().defaultTo('NONE');
    table.jsonb('transformation_config').nullable(); // Additional transformation parameters
    table.jsonb('constants').nullable(); // Constant values for injection
    
    // Mapping metadata
    table.enum('status', ['ACTIVE', 'INACTIVE', 'DRAFT']).notNullable().defaultTo('DRAFT');
    table.integer('order_index').notNullable().defaultTo(0); // For ordered processing
    table.integer('version').notNullable().defaultTo(1); // Version tracking
    
    // Tenant isolation
    table.string('tenant_id', 255).notNullable();
    
    // Audit fields
    table.string('created_by', 255).notNullable();
    table.string('updated_by', 255).nullable();
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['endpoint_id']);
    table.index(['tenant_id']);
    table.index(['tenant_id', 'endpoint_id']);
    table.index(['name']);
    table.index(['status']);
    table.index(['order_index']);
    table.index(['version']);
    table.index(['created_at']);
    
    // Unique constraint to prevent duplicate mapping names per endpoint/tenant
    table.unique(['endpoint_id', 'name', 'tenant_id'], 'unique_mapping_name');
  });
  
  // Create mapping history table for versioning
  await knex.schema.createTable('multi_field_mapping_history', function(table) {
    table.increments('id').primary();
    table.integer('mapping_id').unsigned().notNullable();
    table.foreign('mapping_id').references('id').inTable('multi_field_mappings').onDelete('CASCADE');
    
    // Snapshot of the mapping at this version
    table.jsonb('mapping_snapshot').notNullable();
    table.integer('version').notNullable();
    table.enum('action', ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE']).notNullable();
    
    // Audit information
    table.string('changed_by', 255).notNullable();
    table.text('change_reason').nullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now());
    
    table.index(['mapping_id']);
    table.index(['version']);
    table.index(['action']);
    table.index(['changed_at']);
  });
  
  console.log('✅ Successfully created multi_field_mappings and multi_field_mapping_history tables');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔧 Dropping multi-field mappings tables...');
  await knex.schema.dropTableIfExists('multi_field_mapping_history');
  await knex.schema.dropTableIfExists('multi_field_mappings');
  console.log('✅ Successfully dropped multi-field mappings tables');
};