import React from 'react';

interface SessionWarningModalProps {
  minutesLeft: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  minutesLeft,
  onStayLoggedIn,
  onLogout,
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
      <h2 className="text-xl font-bold mb-4">Session Expiring Soon</h2>
      <p className="mb-6">Your session will expire in <span className="font-semibold">{minutesLeft} minutes</span> due to inactivity.</p>
      <div className="flex justify-center gap-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={onStayLoggedIn}
        >
          Stay Logged In
        </button>
        <button
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
);
