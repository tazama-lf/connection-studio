import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/contexts/AuthContext';
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import DEMSModule from '../features/dems/pages/DEMSModule';
import CRONModule from '../features/cron/pages/CRONModule';
import DataEnrichmentModule from '../features/data-enrichment/pages/DataEnrichmentModule';
import { ROUTES } from '../shared/config/routes.config';
import { APP_CONFIG } from '../shared/config/app.config';

const ProtectedRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.DASHBOARD} element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path={ROUTES.DEMS} element={
        <ProtectedRoute>
          <DEMSModule />
        </ProtectedRoute>
      } />
      <Route path={ROUTES.DATA_ENRICHMENT} element={
        <ProtectedRoute>
          <DataEnrichmentModule />
        </ProtectedRoute>
      } />
      <Route path={ROUTES.CRON} element={
        <ProtectedRoute>
          <CRONModule />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to={APP_CONFIG.defaultRoute} />} />
    </Routes>
  );
};
