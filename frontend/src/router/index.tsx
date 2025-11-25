import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/contexts/AuthContext';
import { isApprover, isPublisher, isExporter, isEditor } from '../utils/roleUtils';
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import DEMSModule from '@pages/dems';
import ApproverModule from '../features/approver/pages/ApproverModule';
import ApproverConfigsPage from '../features/approver/pages/ApproverConfigsPage';
import ApproverDEJobsPage from '../features/approver/pages/ApproverDEJobsPage';
import ApproverCronJobsPage from '../features/approver/pages/ApproverCronJobsPage';
import ExporterConfigsPage from '../features/exporter/pages/ExporterConfigsPage';
import ExporterDEJobsPage from '../features/exporter/pages/ExporterDEJobsPage';
import ExporterCronJobsPage from '../features/exporter/pages/ExporterCronJobsPage';
import PublisherModule from '../features/publisher/pages/PublisherModule';
import PublisherCronJobsPage from '../features/publisher/pages/PublisherCronJobsPage';
import PublisherDEJobsPage from '../features/publisher/pages/PublisherDEJobsPage';
import PublisherConfigsPage from '../features/publisher/pages/PublisherConfigsPage';
import PublisherExportedItemsPage from '../features/publisher/pages/PublisherExportedItemsPage';
import CRONModule from '../features/cron/pages/CRONModule';
import DataEnrichmentModule from '../features/data-enrichment/pages/DataEnrichmentModule';
import NotFoundPage from '../pages/NotFoundPage';
import { ROUTES } from '../shared/config/routes.config';
import { setupFetch401Interceptor } from '../utils/interceptor';
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
    setupFetch401Interceptor(() => navigate("/login"));
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
        <Route path="/approver/cron-jobs" element={
          <ApproverRoute>
            <ApproverCronJobsPage />
          </ApproverRoute>
        } />
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
        <Route path="/exporter/cron-jobs" element={
          <ExporterRoute>
            <ExporterCronJobsPage />
          </ExporterRoute>
        } />
        <Route path={ROUTES.PUBLISHER} element={
          <PublisherRoute>
            <PublisherModule />
          </PublisherRoute>
        } />
        <Route path="/publisher/configs" element={
          <PublisherRoute>
            <PublisherConfigsPage />
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
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};