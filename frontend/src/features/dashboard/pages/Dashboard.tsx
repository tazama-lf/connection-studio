import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ActivityIcon, DatabaseIcon, ClockIcon, CheckCircleIcon, UploadIcon, DownloadIcon, Settings, Server, PackageOpen } from 'lucide-react';
import { NAVIGATION } from '../../../shared/config/routes.config';
import { APP_CONFIG } from '../../../shared/config/app.config';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isApprover, isPublisher, isExporter } from '../../../utils/roleUtils';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Filter modules based on user roles
  const userClaims = user?.claims || [];
  const isUserApprover = isApprover(userClaims);
  const isUserPublisher = isPublisher(userClaims);
  const isUserExporter = isExporter(userClaims);
  
  // If user is a publisher, show the publisher's 4 boxes
  const publisherModules = [
    {
      id: 'configs',
      name: 'Dynamic Endpoint Monitoring Service',
      description: 'Review and publish approved configurations',
      icon: <Settings size={24} />,
      color: 'bg-purple-100 text-purple-600',
      path: '/publisher/configs',
    },
    {
      id: 'de-jobs',
      name: 'Data Enrichment',
      description: 'Review and publish exported data enrichment jobs',
      icon: <DatabaseIcon size={24} />,
      color: 'bg-green-100 text-green-600',
      path: '/publisher/de-jobs',
    },
    {
      id: 'cron-jobs',
      name: 'Cron Job Management',
      description: 'Review and publish exported cron job schedules',
      icon: <ClockIcon size={24} />,
      color: 'bg-blue-100 text-blue-600',
      path: '/publisher/cron-jobs',
    },
   
    {
      id: 'exported-items',
      name: 'Exported Items',
      description: 'Review exported items ready for publishing (Cron Jobs, DE Jobs, DEMS)',
      icon: <PackageOpen size={24} />,
      color: 'bg-indigo-100 text-indigo-600',
      path: '/publisher/exported-items',
    },
  ];

  // If user is an exporter, show the exporter's 3 boxes directly
  const exporterModules = [
    {
      id: 'dems',
      name: 'Dynamic Endpoint Monitoring Service',
      description: 'View and export approved configurations',
      icon: <Settings size={24} />,
      color: 'bg-purple-100 text-purple-600',
      path: '/exporter/configs',
    },
    {
      id: 'de-jobs',
      name: 'Data Enrichment',
      description: 'View and export approved data enrichment jobs',
      icon: <DatabaseIcon size={24} />,
      color: 'bg-green-100 text-green-600',
      path: '/exporter/jobs',
    },
    {
      id: 'cron-jobs',
      name: 'Cron Job Management',
      description: 'View and export approved cron job schedules',
      icon: <ClockIcon size={24} />,
      color: 'bg-blue-100 text-blue-600',
      path: '/exporter/cron-jobs',
    }
  ];
  
  const filteredModules = NAVIGATION.mainModules.filter(module => {
    // If user is an approver, only show the approver module
    if (isUserApprover) {
      return module.id === 'approver';
    }
    // If user is an exporter, don't use navigation modules (we'll use exporterModules)
    if (isUserExporter) {
      return false;
    }
    // If user is a publisher, don't use navigation modules (we'll use publisherModules)
    if (isUserPublisher) {
      return false;
    }
    // For everyone else (editors), show all modules except approver and publisher
    return module.id !== 'approver' && module.id !== 'publisher';
  });
  
  const modules = isUserPublisher ? publisherModules : 
                  isUserExporter ? exporterModules : 
                  filteredModules.map((module: any) => ({
    ...module,
    icon: module.icon === 'ActivityIcon' ? <ActivityIcon size={24} /> :
          module.icon === 'DatabaseIcon' ? <DatabaseIcon size={24} /> :
          module.icon === 'CheckCircleIcon' ? <CheckCircleIcon size={24} /> :
          module.icon === 'ClockIcon' ? <ClockIcon size={24} /> :
          module.icon === 'UploadIcon' ? <UploadIcon size={24} /> : 
          module.icon === 'DownloadIcon' ? <DownloadIcon size={24} /> : null,
    action: () => navigate(module.path)
  }));

  return <div className="min-h-screen bg-gray-50" data-id="element-1151">
      <AuthHeader title={isUserPublisher ? "Publisher Dashboard" : isUserExporter ? "Exporter Dashboard" : APP_CONFIG.name} data-id="element-1152" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-id="element-1153">
        
        
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isUserExporter ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`} data-id="element-1154">
          {modules.map(module => <div key={module.id} className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => navigate(module.path || module.action)} data-id="element-1155">
              <div className="flex items-start" data-id="element-1156">
                <div className={`p-3 rounded-lg ${module.color}`} data-id="element-1157">
                  {module.icon}
                </div>
                <div className="ml-4" data-id="element-1158">
                  <h3 className="text-lg font-medium text-gray-900" data-id="element-1159">
                    {module.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500" data-id="element-1160">
                    {module.description}
                  </p>
                </div>
              </div>
            </div>)}
        </div>
      </main>
    </div>;
};

export default Dashboard;
