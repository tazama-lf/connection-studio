

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('data_model_extensions');
  
  if (!hasTable) {
    console.log('Table data_model_extensions does not exist, skipping migration');
    return;
  }
  
  // Add description column if it doesn't exist
  const hasDescription = await knex.schema.hasColumn('data_model_extensions', 'description');
  if (!hasDescription) {
    console.log('Adding description column...');
    await knex.schema.alterTable('data_model_extensions', (table) => {
      table.text('description').comment('Description of the custom field');
    });
  }
  
  // Add validation column if it doesn't exist
  const hasValidation = await knex.schema.hasColumn('data_model_extensions', 'validation');
  if (!hasValidation) {
    console.log('Adding validation column...');
    await knex.schema.alterTable('data_model_extensions', (table) => {
      table.json('validation').comment('Validation rules (pattern, min, max, enum)');
    });
  }
  
  console.log('✅ data_model_extensions table structure updated');
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('data_model_extensions');
  
  if (!hasTable) {
    return;
  }
  
  await knex.schema.alterTable('data_model_extensions', (table) => {
    // Only drop columns if they exist
    if (knex.schema.hasColumn('data_model_extensions', 'description')) {
      table.dropColumn('description');
    }
    if (knex.schema.hasColumn('data_model_extensions', 'validation')) {
      table.dropColumn('validation');
    }
  });
};
