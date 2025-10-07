/**
 * Migration: Create data_model_extensions table
 * 
 * Stores custom field extensions to the Tazama internal data model.
 * Allows tenants to add custom fields to core collections without
 * modifying the base schema.
 */

exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('data_model_extensions');
  
  if (!exists) {
    return knex.schema.createTable('data_model_extensions', (table) => {
      table.increments('id').primary();
      table.string('collection', 100).notNullable().comment('Target collection (entities, accounts, etc.)');
      table.string('field_name', 100).notNullable().comment('Name of the custom field');
      table.string('field_type', 50).notNullable().comment('Data type (string, number, boolean, object, array, date)');
      table.text('description').comment('Description of the custom field');
      table.boolean('is_required').defaultTo(false).comment('Whether the field is required');
      table.json('default_value').comment('Default value for the field');
      table.json('validation').comment('Validation rules (pattern, min, max, enum)');
      table.string('tenant_id', 255).notNullable().comment('Multi-tenant identifier');
      table.string('created_by', 255).notNullable().comment('User who created the extension');
      table.timestamp('created_at').defaultTo(knex.fn.now()).comment('Creation timestamp');
      table.string('version', 50).defaultTo('v1').comment('Version tracking');

      // Indexes
      table.index(['tenant_id'], 'idx_data_model_extensions_tenant');
      table.index(['collection', 'tenant_id'], 'idx_data_model_extensions_collection');
      table.unique(['collection', 'field_name', 'tenant_id'], 'uq_data_model_extensions');
    });
  }
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('data_model_extensions');
};
