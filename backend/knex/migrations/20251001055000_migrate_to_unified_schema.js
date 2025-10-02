/**
 * Migration to convert existing endpoint schemas to unified schema format
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔄 Migrating endpoints to unified schema format...');
  
  // Get all endpoints with existing schema_json
  const endpoints = await knex('endpoints')
    .whereNotNull('schema_json')
    .select('id', 'schema_json', 'created_by', 'tenant_id');
  
  console.log(`📊 Found ${endpoints.length} endpoints to migrate`);
  
  let migratedCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      let schemaJson = endpoint.schema_json;
      
      // Parse if string
      if (typeof schemaJson === 'string') {
        schemaJson = JSON.parse(schemaJson);
      }
      
      // Check if already in unified format
      if (schemaJson && typeof schemaJson === 'object' && 'sourceFields' in schemaJson) {
        console.log(`⏭️ Endpoint ${endpoint.id} already in unified format, skipping`);
        continue;
      }
      
      // Convert legacy SchemaField[] to UnifiedSchema
      const unifiedSchema = {
        sourceFields: Array.isArray(schemaJson) ? schemaJson : [],
        destinationFields: [
          {
            name: 'AccountDebtor',
            path: 'AccountDebtor',
            type: 'object',
            isRequired: true,
            children: [
              {
                name: 'Identification',
                path: 'AccountDebtor.Identification',
                type: 'string',
                isRequired: true,
              },
              {
                name: 'Name',
                path: 'AccountDebtor.Name',
                type: 'string',
                isRequired: false,
              },
            ],
          },
          {
            name: 'AccountCreditor',
            path: 'AccountCreditor',
            type: 'object',
            isRequired: true,
            children: [
              {
                name: 'Identification',
                path: 'AccountCreditor.Identification',
                type: 'string',
                isRequired: true,
              },
              {
                name: 'Name',
                path: 'AccountCreditor.Name',
                type: 'string',
                isRequired: false,
              },
            ],
          },
          {
            name: 'Amount',
            path: 'Amount',
            type: 'object',
            isRequired: true,
            children: [
              {
                name: 'Currency',
                path: 'Amount.Currency',
                type: 'string',
                isRequired: true,
              },
              {
                name: 'Amount',
                path: 'Amount.Amount',
                type: 'number',
                isRequired: true,
              },
            ],
          },
          {
            name: 'TransactionReference',
            path: 'TransactionReference',
            type: 'string',
            isRequired: true,
          },
          {
            name: 'PaymentInformation',
            path: 'PaymentInformation',
            type: 'object',
            isRequired: false,
            children: [
              {
                name: 'ComplexityScore',
                path: 'PaymentInformation.ComplexityScore',
                type: 'number',
                isRequired: false,
              },
              {
                name: 'FraudScore',
                path: 'PaymentInformation.FraudScore',
                type: 'number',
                isRequired: false,
              },
            ],
          },
        ],
        mappings: [],
        extensions: [],
        version: 1,
        lastUpdated: new Date(),
        createdBy: endpoint.created_by,
      };
      
      // Update endpoint with unified schema
      await knex('endpoints')
        .where('id', endpoint.id)
        .where('tenant_id', endpoint.tenant_id)
        .update({
          schema_json: JSON.stringify(unifiedSchema),
          updated_at: knex.fn.now(),
        });
      
      migratedCount++;
      console.log(`✅ Migrated endpoint ${endpoint.id} to unified schema format`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate endpoint ${endpoint.id}:`, error);
    }
  }
  
  console.log(`🎉 Successfully migrated ${migratedCount} endpoints to unified schema format`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔄 Reverting unified schema format to legacy format...');
  
  // Get all endpoints with unified schema format
  const endpoints = await knex('endpoints')
    .whereNotNull('schema_json')
    .select('id', 'schema_json', 'tenant_id');
  
  console.log(`📊 Found ${endpoints.length} endpoints to revert`);
  
  let revertedCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      let schemaJson = endpoint.schema_json;
      
      // Parse if string
      if (typeof schemaJson === 'string') {
        schemaJson = JSON.parse(schemaJson);
      }
      
      // Check if in unified format
      if (schemaJson && typeof schemaJson === 'object' && 'sourceFields' in schemaJson) {
        // Convert back to legacy SchemaField[] format
        const legacySchema = schemaJson.sourceFields || [];
        
        // Update endpoint with legacy schema
        await knex('endpoints')
          .where('id', endpoint.id)
          .where('tenant_id', endpoint.tenant_id)
          .update({
            schema_json: JSON.stringify(legacySchema),
            updated_at: knex.fn.now(),
          });
        
        revertedCount++;
        console.log(`✅ Reverted endpoint ${endpoint.id} to legacy schema format`);
      } else {
        console.log(`⏭️ Endpoint ${endpoint.id} already in legacy format, skipping`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to revert endpoint ${endpoint.id}:`, error);
    }
  }
  
  console.log(`🎉 Successfully reverted ${revertedCount} endpoints to legacy schema format`);
};