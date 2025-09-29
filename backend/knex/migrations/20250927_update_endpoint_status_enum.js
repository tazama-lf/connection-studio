exports.up = function(knex) {
  return knex.schema.alterTable('endpoints', function(table) {
    // First drop the existing status column
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('endpoints', function(table) {
      // Add the updated enum column with all required values
      table.enu('status', [
        'IN_PROGRESS',
        'PENDING_APPROVAL',
        'APPROVED', 
        'PUBLISHED',
        'UNDER_REVIEW',
        'READY_FOR_DEPLOYMENT',
        'DEPLOYED',
        'SUSPENDED'
      ]).defaultTo('IN_PROGRESS');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('endpoints', function(table) {
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('endpoints', function(table) {
      // Revert to original enum values
      table.enu('status', [
        'IN_PROGRESS',
        'UNDER_REVIEW',
        'APPROVED',
        'READY_FOR_DEPLOYMENT',
        'DEPLOYED',
        'SUSPENDED'
      ]).defaultTo('IN_PROGRESS');
    });
  });
};