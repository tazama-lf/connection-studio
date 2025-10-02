exports.up = function(knex) {
  return knex('endpoints').insert([
    {
      id: 1,
      path: '/api/v1/payments',
      method: 'POST',
      version: 'v1.0',
      transaction_type: 'Payments',
      status: 'DEPLOYED',
      description: 'Test payment endpoint for multi-field mapping',
      created_by: 'system'
    }
  ]);
};

exports.down = function(knex) {
  return knex('endpoints').where('id', 1).del();
};