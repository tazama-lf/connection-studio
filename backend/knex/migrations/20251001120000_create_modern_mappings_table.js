/**
 * Migration to create a modern mappings table for storing source → destination field mappings
 * This supports the separation of endpoints (source schema) from mappings (destination + transformations)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Creating modern mappings table for source → destination field mappings...');
  
  await knex.schema.createTable('field_mappings', function(table) {
    table.increments('id').primary();
    
    // Link to endpoint (source schema)
    table.integer('endpoint_id').unsigned().notNullable();
    table.foreign('endpoint_id').references('id').inTable('endpoints').onDelete('CASCADE');
    
    // Source field information (from endpoint's source schema)
    table.string('source_field_path', 500).notNullable(); // e.g., "transaction.amount.value"
    table.enum('source_field_type', ['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY']).notNullable();
    table.boolean('source_field_required').notNullable().defaultTo(false);
    
    // Destination field information (from Tazama internal data model)
    table.string('destination_field_path', 500).notNullable(); // e.g., "Amount.Amount"
    table.enum('destination_field_type', ['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY']).notNullable();
    table.boolean('destination_field_required').notNullable().defaultTo(false);
    
    // Transformation configuration
    table.enum('transformation', ['NONE', 'CONCAT', 'SUM', 'SPLIT']).notNullable().defaultTo('NONE');
    table.jsonb('transformation_config').nullable(); // Additional transformation parameters
    table.jsonb('constants').nullable(); // Constant values for injection
    
    // Mapping metadata
    table.enum('status', ['ACTIVE', 'INACTIVE', 'DEPRECATED']).notNullable().defaultTo('ACTIVE');
    table.integer('order_index').notNullable().defaultTo(0); // For ordered processing
    
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
    table.index(['source_field_path']);
    table.index(['destination_field_path']);
    table.index(['status']);
    table.index(['order_index']);
    table.index(['created_at']);
    
    // Unique constraint to prevent duplicate mappings
    table.unique(['endpoint_id', 'source_field_path', 'destination_field_path', 'tenant_id'], 'unique_field_mapping');
  });
  
  console.log('✅ Successfully created field_mappings table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔧 Dropping field_mappings table...');
  await knex.schema.dropTableIfExists('field_mappings');
  console.log('✅ Successfully dropped field_mappings table');
};