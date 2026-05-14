import React from 'react';
import { AlertTriangle, RefreshCw, FileX } from 'lucide-react';

interface FileCorruptionErrorProps {
  fileName?: string;
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
}

export const FileCorruptionError: React.FC<FileCorruptionErrorProps> = ({
  fileName,
  onRetry,
  onClose,
  className = '',
}) => (
  <div
    className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
  >
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <AlertTriangle className="h-5 w-5 text-red-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800">
          File Corruption Detected
        </h3>
        <div className="mt-2 text-sm text-red-700">
          <p>
            {fileName ? (
              <>
                The file{' '}
                <span className="font-mono bg-red-100 px-1 rounded">
                  {fileName}
                </span>{' '}
                appears to be corrupted or missing.
              </>
            ) : (
              'The requested file appears to be corrupted or missing.'
            )}
          </p>
          <p className="mt-1">This could be due to:</p>
          <ul className="mt-1 ml-4 list-disc space-y-1">
            <li>Incomplete file transfer</li>
            <li>Data integrity verification failure</li>
            <li>File system corruption</li>
            <li>Network interruption during file creation</li>
          </ul>
        </div>
        <div className="mt-4 flex space-x-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <FileX className="h-4 w-4 mr-2" />
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default FileCorruptionError;
