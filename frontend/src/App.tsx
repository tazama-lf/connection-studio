import { AppProviders } from './shared/providers/AppProviders';
import { AppRoutes } from './router';
import { useSessionManager } from './shared/hooks/useSessionManager';
import { SessionWarningModal } from './shared/components/SessionWarningModal';
import { useAuth } from './features/auth/contexts/AuthContext';
import React, { useState } from 'react';

export default function App() {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(5);

  useSessionManager({
    timeoutMinutes: 30,
    warningMinutes: 5,
    onSessionExpired: () => {
      logout();
    },
    onSessionWarning: () => {
      setShowWarning(true);
      setMinutesLeft(5);
    },
  });

  const handleStayLoggedIn = () => {
    setShowWarning(false);
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
  };

  return (
    <AppProviders>
      <AppRoutes />
      {showWarning && (
        <SessionWarningModal
          minutesLeft={minutesLeft}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={handleLogout}
        />
      )}
    </AppProviders>
  );
}