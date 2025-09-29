/**
 * Migration to complete endpoints status enum update to match EndpointStatus interface
 * This fixes the previous 20250927 migration by adding the missing DEPRECATED status
 * and ensuring proper data preservation during enum updates
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🔧 Updating endpoints status enum to include all lifecycle statuses...');

    // Step 1: Backup existing data to preserve during enum update
    const existingEndpoints = await trx('endpoints').select('id', 'status');
    console.log(`📊 Found ${existingEndpoints.length} existing endpoints to preserve`);

    // Step 2: Update any null or invalid status values to IN_PROGRESS
    await trx('endpoints')
      .where(function() {
        this.whereNull('status')
          .orWhereNotIn('status', [
            'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED',
            'UNDER_REVIEW', 'READY_FOR_DEPLOYMENT', 'DEPLOYED', 'SUSPENDED'
          ]);
      })
      .update({ status: 'IN_PROGRESS' });

    // Step 3: Drop the existing status column to rebuild with complete enum
    await trx.schema.alterTable('endpoints', function(table) {
      table.dropColumn('status');
    });

    // Step 4: Add the complete enum column with all required status values
    await trx.schema.alterTable('endpoints', function(table) {
      table.enu('status', [
        'IN_PROGRESS',
        'PENDING_APPROVAL', 
        'UNDER_REVIEW',
        'READY_FOR_DEPLOYMENT',
        'DEPLOYED',
        'SUSPENDED',
        'PUBLISHED',
        'DEPRECATED'
      ]).defaultTo('IN_PROGRESS').notNullable();
    });

    // Step 5: Restore the preserved data
    for (const endpoint of existingEndpoints) {
      if (endpoint.status) {
        await trx('endpoints')
          .where('id', endpoint.id)
          .update({ status: endpoint.status });
      }
    }

    console.log('✅ Successfully updated endpoints status enum with complete lifecycle');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🔄 Rolling back endpoints status enum to previous state...');

    // Step 1: Preserve existing data before rollback
    const existingEndpoints = await trx('endpoints').select('id', 'status');
    console.log(`📊 Preserving ${existingEndpoints.length} existing endpoints during rollback`);

    // Step 2: Convert new status values to compatible legacy values
    const statusMappings = {
      'PENDING_APPROVAL': 'UNDER_REVIEW',
      'PUBLISHED': 'DEPLOYED', 
      'DEPRECATED': 'SUSPENDED'
    };

    for (const [newStatus, oldStatus] of Object.entries(statusMappings)) {
      const count = await trx('endpoints')
        .where('status', newStatus)
        .update({ status: oldStatus });
      
      if (count > 0) {
        console.log(`📝 Converted ${count} endpoints from ${newStatus} to ${oldStatus}`);
      }
    }

    // Step 3: Drop current status column
    await trx.schema.alterTable('endpoints', function(table) {
      table.dropColumn('status');
    });

    // Step 4: Recreate with original limited enum values
    await trx.schema.alterTable('endpoints', function(table) {
      table.enu('status', [
        'IN_PROGRESS',
        'UNDER_REVIEW',
        'APPROVED',
        'READY_FOR_DEPLOYMENT',
        'DEPLOYED',
        'SUSPENDED'
      ]).defaultTo('IN_PROGRESS').notNullable();
    });

    // Step 5: Restore data with converted status values
    for (const endpoint of existingEndpoints) {
      if (endpoint.status) {
        const mappedStatus = statusMappings[endpoint.status] || endpoint.status;
        await trx('endpoints')
          .where('id', endpoint.id)
          .update({ status: mappedStatus });
      }
    }

    console.log('⚠️ Rollback completed - reverted to original 6-status enum');
  });
};