/**
 * Migration to remove schema_fields and schema_versions tables
 * This completes the schema storage refactoring by removing the old separate tables
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🗑️ Removing old schema tables...');
    
    // Drop schema_fields table first (has foreign key to schema_versions)
    await trx.schema.dropTableIfExists('schema_fields');
    console.log('✅ Dropped schema_fields table');
    
    // Drop schema_versions table
    await trx.schema.dropTableIfExists('schema_versions');
    console.log('✅ Dropped schema_versions table');
    
    console.log('✅ Successfully removed old schema tables');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🔧 Recreating schema tables...');
    
    // Recreate schema_versions table
    await trx.schema.createTable('schema_versions', function(table) {
      table.increments('id').primary();
      table.integer('endpoint_id').references('id').inTable('endpoints').onDelete('CASCADE');
      table.integer('version').notNullable();
      table.jsonb('schema_definition').notNullable();
      table.string('created_by').notNullable();
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());
      
      table.index(['tenant_id']);
      table.index(['tenant_id', 'endpoint_id']);
    });
    
    // Recreate schema_fields table
    await trx.schema.createTable('schema_fields', function(table) {
      table.increments('id').primary();
      table.integer('schema_version_id').references('id').inTable('schema_versions').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('path').notNullable();
      table.enu('type', ['string', 'number', 'boolean', 'object', 'array']).notNullable();
      table.boolean('is_required').defaultTo(false);
      table.integer('parent_field_id').references('id').inTable('schema_fields').onDelete('CASCADE').nullable();
      table.string('array_element_type').nullable();
      table.jsonb('validation_rules').nullable();
      table.integer('field_order').defaultTo(0);
      table.string('tenant_id', 255).notNullable().defaultTo('default-tenant');
      table.timestamp('created_at').defaultTo(trx.fn.now());
      
      table.index(['schema_version_id']);
      table.index(['parent_field_id']);
      table.index(['path']);
      table.index(['tenant_id']);
    });
    
    console.log('✅ Successfully recreated schema tables');
  });
};
