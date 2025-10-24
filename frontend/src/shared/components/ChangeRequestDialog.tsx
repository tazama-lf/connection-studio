import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from './Button';

interface ChangeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestedChanges: string) => void;
  configName: string;
}

export const ChangeRequestDialog: React.FC<ChangeRequestDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  configName
}) => {
  const [requestedChanges, setRequestedChanges] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestedChanges.trim()) {
      setError('Please provide details about the requested changes');
      return;
    }


    onConfirm(requestedChanges.trim());
    setRequestedChanges('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setRequestedChanges('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Enhanced blurred backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm backdrop-saturate-150" onClick={handleClose}></div>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative z-10">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Request Changes</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              You are requesting changes to the configuration: <strong>{configName}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This will send the configuration back to the editor with your change requirements.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="requestedChanges" className="block text-sm font-medium text-gray-700 mb-2">
              Requested Changes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="requestedChanges"
              value={requestedChanges}
              onChange={(e) => {
                setRequestedChanges(e.target.value);
                if (error) setError('');
              }}
              placeholder="Please describe the specific changes you need the editor to make..."
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={4}
              required
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!requestedChanges.trim()}
            >
              Request Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};