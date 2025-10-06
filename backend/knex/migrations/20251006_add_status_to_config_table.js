/**
 * Migration: Add status column to config table
 */

exports.up = function (knex) {
  return knex.schema.table('config', (table) => {
    table.string('status').notNullable().defaultTo('inprogress')
      .comment('Status of the config (draft, inprogress, completed, failed)');
  });
};

exports.down = function (knex) {
  return knex.schema.table('config', (table) => {
    table.dropColumn('status');
  });
};