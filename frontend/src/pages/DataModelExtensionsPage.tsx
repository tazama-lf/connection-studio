import React from 'react';
import { ExtensionManagement } from '../features/data-model';

/**
 * Data Model Extensions Test Page
 * 
 * This page demonstrates the ExtensionManagement component functionality:
 * - View all existing data model extensions
 * - Create new custom fields for Tazama collections
 * - Edit extension properties (description, validation, default values)
 * - Delete extensions
 * 
 * Extensions allow tenants to add custom fields to standard Tazama collections:
 * - entities (persons, organizations)
 * - accounts (financial accounts)
 * - account_holder (ownership relationships)
 * - transactionRelationship (transaction connections)
 * - transactionHistory (historical data)
 */
export const DataModelExtensionsPage: React.FC = () => {
  const handleExtensionChange = () => {
    console.log('Extensions updated! Destination options should be refreshed.');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Data Model Extensions
        </h1>
        <p className="text-lg text-gray-600">
          Extend the Tazama data model with custom fields specific to your use case. 
          Extensions are tenant-isolated and become available in the mapping interface.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <ExtensionManagement onExtensionChange={handleExtensionChange} />
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How Data Model Extensions Work
        </h3>
        <div className="text-blue-800 space-y-2">
          <p>• <strong>Custom Fields:</strong> Add new fields to existing Tazama collections</p>
          <p>• <strong>Field Types:</strong> Support for STRING, NUMBER, BOOLEAN, DATE, OBJECT, and ARRAY types</p>
          <p>• <strong>Validation:</strong> Set validation rules like min/max values, regex patterns</p>
          <p>• <strong>Mapping Integration:</strong> Extensions automatically appear in destination options</p>
          <p>• <strong>Tenant Isolation:</strong> Each tenant has their own set of extensions</p>
          <p>• <strong>Runtime Processing:</strong> Extensions are treated like native fields during data processing</p>
        </div>
      </div>
    </div>
  );
};

export default DataModelExtensionsPage;