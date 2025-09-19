import React from 'react';
import { XIcon } from 'lucide-react';
interface JsonDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  title?: string;
}
export const JsonDataModal: React.FC<JsonDataModalProps> = ({
  isOpen,
  onClose,
  data,
  title = 'JSON Data'
}) => {
  if (!isOpen) return null;
  // Format the JSON with indentation for better readability
  const formattedJson = JSON.stringify(data, null, 2);
  return <div className="fixed inset-0 z-50 overflow-y-auto" data-id="element-1074">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0" data-id="element-1075">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose} data-id="element-1076">
          <div className="absolute inset-0 bg-gray-500 opacity-75" data-id="element-1077"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full" data-id="element-1078">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4" data-id="element-1079">
            <div className="flex justify-between items-center mb-4" data-id="element-1080">
              <h3 className="text-lg leading-6 font-medium text-gray-900" data-id="element-1081">
                {title}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500" data-id="element-1082">
                <XIcon size={20} data-id="element-1083" />
              </button>
            </div>
            <div className="mt-2" data-id="element-1084">
              <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm text-gray-800" data-id="element-1085">
                {formattedJson}
              </pre>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse" data-id="element-1086">
            <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm" data-id="element-1087">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>;
};