import React, { useState } from 'react';
import { dataModelApi } from '../features/data-model';

/**
 * Debug Component for Extension Creation
 * 
 * This component helps debug data model extension creation issues
 * by providing detailed logging and error reporting.
 */
export const ExtensionDebugPage: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testExtensionCreation = async () => {
    setLoading(true);
    setResult('');

    try {
      console.log('🧪 Starting extension creation test...');
      
      // Test basic extension creation
      const testRequest = {
        collection: 'entities' as const,
        fieldName: 'testField_' + Date.now(), // Unique name
        fieldType: 'STRING' as const,
        description: 'Test field for debugging',
        isRequired: false,
        defaultValue: 'test_default'
      };

      console.log('🧪 Test request:', testRequest);
      
      const response = await dataModelApi.createExtension(testRequest);
      
      console.log('🧪 Test response:', response);
      
      if (response.success) {
        setResult('✅ SUCCESS: Extension created successfully!\n\n' +
                  `Response: ${JSON.stringify(response, null, 2)}`);
      } else {
        setResult('❌ FAILED: Extension creation failed!\n\n' +
                  `Error: ${response.message}\n\n` +
                  `Response: ${JSON.stringify(response, null, 2)}`);
      }
      
    } catch (error) {
      console.error('🧪 Test error:', error);
      setResult('💥 ERROR: Exception during extension creation!\n\n' +
                `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
                `Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    setLoading(true);
    setResult('');

    try {
      console.log('🔌 Testing API connection...');
      
      // Test getting all extensions first
      const response = await dataModelApi.getAllExtensions();
      
      console.log('🔌 Connection test response:', response);
      
      if (response.success) {
        setResult('✅ API CONNECTION OK\n\n' +
                  `Found ${response.extensions?.length || 0} existing extensions\n\n` +
                  `Response: ${JSON.stringify(response, null, 2)}`);
      } else {
        setResult('❌ API CONNECTION ISSUE\n\n' +
                  `Error: ${response.message}\n\n` +
                  `Response: ${JSON.stringify(response, null, 2)}`);
      }
      
    } catch (error) {
      console.error('🔌 Connection test error:', error);
      setResult('💥 CONNECTION ERROR\n\n' +
                `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
                `Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Extension Creation Debug Tool</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
        
        <div className="space-x-4 mb-4">
          <button
            onClick={testApiConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test API Connection'}
          </button>
          
          <button
            onClick={testExtensionCreation}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Extension Creation'}
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Test API Connection:</strong> Checks if the data model API is responding correctly</p>
          <p>• <strong>Test Extension Creation:</strong> Attempts to create a test extension and reports detailed results</p>
          <p>• Check the browser console for detailed logs</p>
        </div>
      </div>

      {result && (
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-md font-semibold mb-2">Test Result:</h3>
          <pre className="text-sm whitespace-pre-wrap font-mono bg-white p-4 rounded border">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-md font-semibold text-yellow-800 mb-2">Debug Instructions:</h3>
        <div className="text-yellow-700 text-sm space-y-1">
          <p>1. Open browser Developer Tools (F12) and go to Console tab</p>
          <p>2. Click "Test API Connection" first to verify basic connectivity</p>
          <p>3. Click "Test Extension Creation" to debug the specific issue</p>
          <p>4. Check console logs for detailed request/response information</p>
          <p>5. Share the console logs and results above with the development team</p>
        </div>
      </div>
    </div>
  );
};

export default ExtensionDebugPage;