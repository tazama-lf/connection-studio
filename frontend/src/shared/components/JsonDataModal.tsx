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
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-id="element-1074">
        <div className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity" aria-hidden="true" onClick={onClose} data-id="element-1076">
        </div>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative z-10" data-id="element-1078">
          <div className="flex justify-between items-center p-6 border-b border-gray-200" data-id="element-1079">
            <h3 className="text-lg leading-6 font-medium text-gray-900" data-id="element-1081">
              {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500" data-id="element-1082">
              <XIcon size={20} data-id="element-1083" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6" data-id="element-1084">
            <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800 whitespace-pre-wrap" data-id="element-1085">
              {formattedJson}
            </pre>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end" data-id="element-1086">
            <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm" data-id="element-1087">
              Close
            </button>
          </div>
        </div>
    </div>;
};