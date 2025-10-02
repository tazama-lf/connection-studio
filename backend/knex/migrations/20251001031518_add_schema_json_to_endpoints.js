/**
 * Migration to add schema_json column to endpoints table and migrate existing schema data
 * This migration consolidates schema storage from separate tables into a single JSON column
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🔧 Adding schema_json column to endpoints table...');
    
    // Step 1: Add schema_json column to endpoints table
    await trx.schema.alterTable('endpoints', function(table) {
      table.jsonb('schema_json').nullable();
      table.integer('schema_version').defaultTo(1);
      table.index(['tenant_id', 'schema_version']);
    });
    
    console.log('✅ Added schema_json column to endpoints table');
    
    // Step 2: Migrate existing schema data from schema_versions table
    console.log('🔄 Migrating existing schema data...');
    
    const existingSchemas = await trx('schema_versions as sv')
      .select('sv.endpoint_id', 'sv.schema_definition', 'sv.version', 'sv.created_by', 'sv.tenant_id')
      .join('endpoints as e', 'e.id', 'sv.endpoint_id')
      .whereRaw('sv.version = (SELECT MAX(version) FROM schema_versions WHERE endpoint_id = sv.endpoint_id AND tenant_id = sv.tenant_id)');
    
    console.log(`📊 Found ${existingSchemas.length} schemas to migrate`);
    
    // Update endpoints with their latest schema data
    for (const schema of existingSchemas) {
      let schemaJson;
      try {
        // Parse the schema_definition if it's a string
        schemaJson = typeof schema.schema_definition === 'string' 
          ? JSON.parse(schema.schema_definition) 
          : schema.schema_definition;
      } catch (error) {
        console.warn(`⚠️ Failed to parse schema for endpoint ${schema.endpoint_id}, using empty array`);
        schemaJson = [];
      }
      
      await trx('endpoints')
        .where('id', schema.endpoint_id)
        .where('tenant_id', schema.tenant_id)
        .update({
          schema_json: JSON.stringify(schemaJson),
          schema_version: schema.version
        });
    }
    
    console.log('✅ Successfully migrated existing schema data to endpoints table');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🔧 Reverting schema_json migration...');
    
    // Remove the added columns
    await trx.schema.alterTable('endpoints', function(table) {
      table.dropIndex(['tenant_id', 'schema_version']);
      table.dropColumn('schema_json');
      table.dropColumn('schema_version');
    });
    
    console.log('✅ Successfully reverted schema_json migration');
  });
};
