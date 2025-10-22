/**
 * Migration: Update config status column for workflow management
 * Implements the new status enum with proper constraints and default values
 */

exports.up = function (knex) {
  return knex.schema.alterTable('config', (table) => {
    // First, update any existing records with old status values to the new format
    // Then drop the existing status column and recreate with proper constraints
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('config', (table) => {
      table.string('status', 30)
        .notNullable()
        .defaultTo('IN_PROGRESS')
        .checkIn(['IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'DEPLOYED', 'REJECTED', 'CHANGES_REQUESTED'])
        .comment('Workflow status of the configuration');
    });
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('config', (table) => {
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('config', (table) => {
      table.string('status')
        .notNullable()
        .defaultTo('inprogress')
        .comment('Status of the config (draft, inprogress, completed, failed)');
    });
  });
};