exports.up = function(knex) {
  return knex.schema.alterTable('endpoints', function(table) {
    // First drop the existing column
    table.dropColumn('transaction_type');
  }).then(() => {
    return knex.schema.alterTable('endpoints', function(table) {
      // Add the new enum column
      table.enu('transaction_type', ['Transfers', 'Payments']).notNullable();
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('endpoints', function(table) {
    table.dropColumn('transaction_type');
  }).then(() => {
    return knex.schema.alterTable('endpoints', function(table) {
      table.string('transaction_type').notNullable();
    });
  });
};