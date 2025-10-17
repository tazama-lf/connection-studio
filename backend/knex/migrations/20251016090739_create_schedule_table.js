
exports.up = function (knex) {
    return knex.schema.createTable('schedule', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
        table.string('cron').notNullable();
        table.integer('iterations').notNullable();
        table.enu('schedule_status', ['in-active', 'active']).notNullable().defaultTo('active');;
        table.timestamp('start_date').notNullable();
        table.timestamp('end_date').nullable();
    });
};


exports.down = function (knex) {
    return knex.schema.dropTableIfExists('schedule');
};
