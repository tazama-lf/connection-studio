import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/contexts/AuthContext';
import { isApprover, isPublisher, isExporter, isEditor } from '../utils/common/roleUtils';
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import DEMSModule from '@pages/dems';
import ApproverConfigsPage from '../features/approver/pages/ApproverConfigsPage';
import ApproverDEJobsPage from '../features/approver/pages/ApproverDEJobsPage';
import ExporterConfigsPage from '../features/exporter/pages/ExporterConfigsPage';
import ExporterDEJobsPage from '../features/exporter/pages/ExporterDEJobsPage';
import PublisherModule from '../features/publisher/pages/PublisherModule';
import PublisherDEJobsPage from '../features/publisher/pages/PublisherDEJobsPage';
import PublisherConfigsPage from '../features/publisher/pages/PublisherConfigsPage';
import PublisherExportedItemsPage from '../features/publisher/pages/PublisherExportedItemsPage';
import CRONModule from '../features/cron/pages/index';
import DataEnrichmentModule from '../features/data-enrichment/pages/DataEnrichmentModule';
import EndpointHistoryPage from '../features/data-enrichment/pages/EndpointHistoryPage';
import NotFoundPage from '../pages/NotFoundPage';
import { ROUTES } from '../shared/config/routes.config';
import { setupFetch401Interceptor } from '../utils/common/interceptor';
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
  if (!user?.claims || (!isPublisher(user.claims) && !isExporter(user.claims))) {
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
  if (!user?.claims || !isEditor(user.claims)) {
    return <Navigate to={ROUTES.DASHBOARD} />;
  }
  return <>{children}</>;
};
export const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const { loading } = useAuth();


 useEffect(() => {
    setupFetch401Interceptor(async () => { await navigate('/login'); });
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }>
        <Route path={ROUTES.DASHBOARD} element={<div />} />
        <Route path={ROUTES.DEMS} element={
          <EditorRoute>
            <DEMSModule />
          </EditorRoute>
        } />
        {/* <Route path={ROUTES.APPROVER} element={
          <ApproverRoute>
            <ApproverModule />
          </ApproverRoute>
        } /> */}
        <Route path="/approver/configs" element={
          <ApproverRoute>
            <ApproverConfigsPage />
          </ApproverRoute>
        } />
        <Route path="/approver/jobs" element={
          <ApproverRoute>
            <ApproverDEJobsPage />
          </ApproverRoute>
        } />
        {/* Redirect old cron routes to new unified route */}
        <Route path="/approver/cron-jobs" element={<Navigate to={ROUTES.CRON} replace />} />
        <Route path="/exporter/configs" element={
          <ExporterRoute>
            <ExporterConfigsPage />
          </ExporterRoute>
        } />
        <Route path="/exporter/jobs" element={
          <ExporterRoute>
            <ExporterDEJobsPage />
          </ExporterRoute>
        } />
        {/* Redirect old cron routes to new unified route */}
        <Route path="/exporter/cron-jobs" element={<Navigate to={ROUTES.CRON} replace />} />
        <Route path={ROUTES.PUBLISHER} element={
          <PublisherRoute>
            <PublisherModule />
          </PublisherRoute>
        } />
        <Route path="/publisher/cron-jobs" element={<Navigate to={ROUTES.CRON} replace />} />
        <Route path="/publisher/configs" element={
          <PublisherRoute>
            <PublisherConfigsPage />
        {/* Redirect old cron routes to new unified route */}
        <Route path="/publisher/cron-jobs" element={<Navigate to={ROUTES.CRON} replace />} />
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
        <Route path={ROUTES.DATA_ENRICHMENT_HISTORY} element={
          <PublisherRoute>
            <EndpointHistoryPage />
          </PublisherRoute>
        } />
        <Route path={ROUTES.CRON} element={
          <ProtectedRoute>
            <CRONModule />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};