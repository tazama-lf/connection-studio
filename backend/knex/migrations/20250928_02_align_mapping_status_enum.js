/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('mappings', function(table) {
    // First drop the existing status column
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('mappings', function(table) {
      // Add the updated enum column with all endpoint statuses
      table.enu('status', [
        'IN_PROGRESS',
        'PENDING_APPROVAL',
        'UNDER_REVIEW',
        'READY_FOR_DEPLOYMENT',
        'DEPLOYED',
        'SUSPENDED',
        'PUBLISHED',
        'DEPRECATED'
      ]).defaultTo('IN_PROGRESS');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('mappings', function(table) {
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('mappings', function(table) {
      // Revert to original enum values
      table.enu('status', ['IN_PROGRESS', 'APPROVED', 'PUBLISHED']).defaultTo('IN_PROGRESS');
    });
  });
};