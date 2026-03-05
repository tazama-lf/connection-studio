import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Database, Clock } from 'lucide-react';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isExporter } from '../../../utils/common/roleUtils';

export const ExporterModule: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // Role-based access check
  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      showError('You do not have permission to access the Exporter Dashboard');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);

  // Module configuration following Publisher pattern
  const modules = [
    {
      id: 'dems',
      name: 'Dynamic Event Monitoring Service',
      description: 'View and export approved configurations',
      icon: <Settings size={24} />,
      color: 'bg-purple-100 text-purple-600',
      path: '/exporter/configs',
    },
    {
      id: 'de-jobs',
      name: 'Data Enrichment',
      description: 'View and export approved data enrichment jobs',
      icon: <Database size={24} />,
      color: 'bg-green-100 text-green-600',
      path: '/exporter/jobs',
    },
    {
      id: 'cron-jobs',
      name: 'Cron Job Management',
      description: 'View and export approved cron job schedules',
      icon: <Clock size={24} />,
      color: 'bg-blue-100 text-blue-600',
      path: '/exporter/cron-jobs',
    }
  ];

  if (!isAuthenticated || !userIsExporter) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {modules.map((module) => (
            <div
              key={module.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
              onClick={async () => { await navigate(module.path); }}
            >
              <div className="flex items-start">
                <div className={`p-3 rounded-lg ${module.color}`}>
                  {module.icon}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {module.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {module.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ExporterModule;