/**
 * Migration to drop the legacy mappings table since we now use unified schema storage
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Dropping legacy mappings table...');
  
  // Drop mappings table since we now store mappings in endpoints.schema_json
  await knex.raw('DROP TABLE IF EXISTS mappings CASCADE');
  
  console.log('✅ Successfully dropped legacy mappings table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔧 Recreating legacy mappings table...');
  
  // Recreate mappings table if needed for rollback
  await knex.schema.createTable('mappings', function(table) {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.integer('version').notNullable().defaultTo(1);
    table.enum('status', ['IN_PROGRESS', 'APPROVED', 'PUBLISHED']).defaultTo('IN_PROGRESS');
    table.jsonb('source_fields').notNullable();
    table.jsonb('destination_fields').notNullable();
    table.enum('transformation', ['NONE', 'CONCAT', 'SUM', 'SPLIT']).defaultTo('NONE');
    table.jsonb('constants').nullable();
    table.string('created_by', 255).notNullable();
    table.integer('endpoint_id').unsigned().nullable();
    table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
    table.timestamps(true, true);
    
    // Indexes
    table.unique(['name', 'version']);
    table.index(['name']);
    table.index(['status']);
    table.index(['endpoint_id']);
    table.index(['tenant_id']);
    table.index(['tenant_id', 'name']);
    table.index(['tenant_id', 'status']);
    
    // Foreign key
    table.foreign('endpoint_id').references('id').inTable('endpoints').onDelete('SET NULL');
  });
  
  console.log('✅ Successfully recreated legacy mappings table');
};