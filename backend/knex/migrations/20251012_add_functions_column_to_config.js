/**
 * Migration: Add functions column to config table
 * Adds support for storing function definitions with parameters and source mappings
 */

exports.up = function (knex) {
  return knex.schema.table('config', (table) => {
    table.jsonb('functions').nullable().comment('Array of function definitions with params, sources, and function names');
  });
};

exports.down = function (knex) {
  return knex.schema.table('config', (table) => {
    table.dropColumn('functions');
  });
};