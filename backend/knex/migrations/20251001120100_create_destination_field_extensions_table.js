/**
 * Migration to create table for storing data model extensions
 * These are custom destination fields that extend the Tazama internal data model
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Creating destination_field_extensions table for custom destination fields...');
  
  await knex.schema.createTable('destination_field_extensions', function(table) {
    table.increments('id').primary();
    
    // Field definition
    table.string('name', 255).notNullable();
    table.string('path', 500).notNullable(); // e.g., "CustomFields.BusinessCategory"
    table.enum('type', ['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY']).notNullable();
    table.boolean('is_required').notNullable().defaultTo(false);
    table.text('description').nullable();
    
    // Hierarchical structure support
    table.integer('parent_id').unsigned().nullable();
    table.foreign('parent_id').references('id').inTable('destination_field_extensions').onDelete('CASCADE');
    table.integer('order_index').notNullable().defaultTo(0);
    
    // Category/grouping
    table.string('category', 100).notNullable().defaultTo('CUSTOM'); // e.g., 'CUSTOM', 'REGULATORY', 'BUSINESS'
    table.string('collection', 100).nullable(); // Optional grouping for related fields
    
    // Status and versioning
    table.enum('status', ['DRAFT', 'ACTIVE', 'DEPRECATED']).notNullable().defaultTo('DRAFT');
    table.integer('version').notNullable().defaultTo(1);
    
    // Tenant isolation
    table.string('tenant_id', 255).notNullable();
    
    // Audit fields
    table.string('created_by', 255).notNullable();
    table.string('updated_by', 255).nullable();
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['tenant_id']);
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'category']);
    table.index(['tenant_id', 'collection']);
    table.index(['path']);
    table.index(['parent_id']);
    table.index(['status']);
    table.index(['category']);
    table.index(['version']);
    table.index(['created_at']);
    
    // Unique constraint for path per tenant
    table.unique(['tenant_id', 'path'], 'unique_destination_field_path');
    
    // Unique constraint for name + version per tenant
    table.unique(['tenant_id', 'name', 'version'], 'unique_destination_field_version');
  });
  
  console.log('✅ Successfully created destination_field_extensions table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔧 Dropping destination_field_extensions table...');
  await knex.schema.dropTableIfExists('destination_field_extensions');
  console.log('✅ Successfully dropped destination_field_extensions table');
};