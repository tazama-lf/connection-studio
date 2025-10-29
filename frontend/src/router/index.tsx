import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/contexts/AuthContext';
import { isApprover, isPublisher, isExporter } from '../utils/roleUtils';
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import DEMSModule from '../features/dems/pages/DEMSModule';
import ApproverModule from '../features/approver/pages/ApproverModule';
import ExporterModule from '../features/exporter/pages/ExporterModule';
import PublisherModule from '../features/publisher/pages/PublisherModule';
import PublisherCronJobsPage from '../features/publisher/pages/PublisherCronJobsPage';
import PublisherDEJobsPage from '../features/publisher/pages/PublisherDEJobsPage';
import PublisherExportedItemsPage from '../features/publisher/pages/PublisherExportedItemsPage';
import CRONModule from '../features/cron/pages/CRONModule';
import DataEnrichmentModule from '../features/data-enrichment/pages/DataEnrichmentModule';
import NotFoundPage from '../pages/NotFoundPage';
import { ROUTES } from '../shared/config/routes.config';

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

const ApproverRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />;
  }
  if (!user?.claims || !isApprover(user.claims)) {
    return <Navigate to={ROUTES.DASHBOARD} />;
  }
  return <>{children}</>;
};

const PublisherRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />;
  }
  if (!user?.claims || !isPublisher(user.claims)) {
    return <Navigate to={ROUTES.DASHBOARD} />;
  }
  return <>{children}</>;
};

const ExporterRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />;
  }
  if (!user?.claims || !isExporter(user.claims)) {
    return <Navigate to={ROUTES.DASHBOARD} />;
  }
  return <>{children}</>;
};

const EditorRoute = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />;
  }
  if (!user?.claims || isApprover(user.claims)) {
    return <Navigate to={ROUTES.APPROVER} />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} /> : <Navigate to={ROUTES.LOGIN} />
      } />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.DASHBOARD} element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path={ROUTES.DEMS} element={
        <EditorRoute>
          <DEMSModule />
        </EditorRoute>
      } />
      <Route path={ROUTES.APPROVER} element={
        <ApproverRoute>
          <ApproverModule />
        </ApproverRoute>
      } />
      <Route path={ROUTES.EXPORTER} element={
        <ExporterRoute>
          <ExporterModule />
        </ExporterRoute>
      } />
      <Route path={ROUTES.PUBLISHER} element={
        <PublisherRoute>
          <PublisherModule />
        </PublisherRoute>
      } />
      <Route path="/publisher/cron-jobs" element={
        <PublisherRoute>
          <PublisherCronJobsPage />
        </PublisherRoute>
      } />
      <Route path="/publisher/de-jobs" element={
        <PublisherRoute>
          <PublisherDEJobsPage />
        </PublisherRoute>
      } />
      <Route path="/publisher/exported-items" element={
        <PublisherRoute>
          <PublisherExportedItemsPage />
        </PublisherRoute>
      } />
      <Route path={ROUTES.DATA_ENRICHMENT} element={
        <EditorRoute>
          <DataEnrichmentModule />
        </EditorRoute>
      } />
      <Route path={ROUTES.CRON} element={
        <EditorRoute>
          <CRONModule />
        </EditorRoute>
      } />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
