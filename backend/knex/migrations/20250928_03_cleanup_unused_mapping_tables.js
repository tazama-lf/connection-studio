/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Drop unused mapping-related tables in the correct order to handle foreign key dependencies
  return knex.raw('DROP TABLE IF EXISTS mapping_audit_logs CASCADE')
    .then(() => knex.raw('DROP TABLE IF EXISTS mapping_fields CASCADE'))
    .then(() => knex.raw('DROP TABLE IF EXISTS mapping_configurations CASCADE'));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Recreate the tables if needed (though they shouldn't be needed)
  return Promise.resolve();
};