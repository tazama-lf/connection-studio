import React from 'react';
import { CheckCircleIcon } from 'lucide-react';
interface DeploymentConfirmationProps {
  endpointPath: string;
  transactionType?: 'transfers' | 'payments';
}
export const DeploymentConfirmation: React.FC<DeploymentConfirmationProps> = ({
  endpointPath,
  transactionType = 'transfers'
}) => {
  // Format the endpoint path to include the transaction type
  const formattedEndpointPath = `${endpointPath}-${transactionType}`;
  return <div className="space-y-6" data-id="element-156">
      <div className="flex items-center space-x-2" data-id="element-157">
        <CheckCircleIcon className="h-6 w-6 text-green-500" data-id="element-158" />
        <h3 className="text-lg font-medium text-gray-900" data-id="element-159">Ready to Deploy</h3>
      </div>
      <div className="bg-gray-50 p-4 rounded-md space-y-4" data-id="element-160">
        <div data-id="element-161">
          <h4 className="text-sm font-medium text-gray-700" data-id="element-162">Endpoint Path:</h4>
          <p className="mt-1 text-sm text-gray-900" data-id="element-163">{formattedEndpointPath}</p>
        </div>
        <div data-id="element-164">
          <h4 className="text-sm font-medium text-gray-700" data-id="element-165">Configuration:</h4>
          <div className="mt-2 bg-white p-3 rounded border border-gray-200" data-id="element-166">
            <pre className="text-sm text-gray-600" data-id="element-167">
              {JSON.stringify({
              endpoint: formattedEndpointPath,
              transactionType: transactionType,
              schema: {
                type: 'object',
                required: ['transactionId', 'amount', 'currency'],
                properties: {
                  transactionId: {
                    type: 'string'
                  },
                  amount: {
                    type: 'number'
                  },
                  currency: {
                    type: 'string'
                  }
                }
              },
              mapping: {
                transactionId: 'id',
                amount: 'value',
                currency: 'currencyCode'
              }
            }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>;
};