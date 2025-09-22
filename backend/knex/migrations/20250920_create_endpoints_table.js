exports.up = function(knex) {
  return knex.schema.createTable('endpoints', function(table) {
    table.increments('id').primary();
    table.string('path').notNullable();
    table.string('method').notNullable();
    table.string('version').notNullable();
    table.string('transaction_type').notNullable();
    table.enu('status', [
      'IN_PROGRESS',
      'UNDER_REVIEW',
      'APPROVED',
      'READY_FOR_DEPLOYMENT',
      'DEPLOYED',
      'SUSPENDED'
    ]).defaultTo('IN_PROGRESS');
    table.text('description').nullable();
    table.string('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('endpoints');
};
