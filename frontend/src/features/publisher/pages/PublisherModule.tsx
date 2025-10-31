import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Clock, Database, Settings, PackageOpen } from 'lucide-react';

const PublisherModule: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
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
      icon: <Database size={24} />,
      color: 'bg-green-100 text-green-600',
      path: '/publisher/de-jobs',
    },
    {
      id: 'cron-jobs',
      name: 'Cron Job Management',
      description: 'Review and publish exported cron job schedules',
      icon: <Clock size={24} />,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Publisher Dashboard" showBackButton={false} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {modules.map((module) => (
            <div
              key={module.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
              onClick={() => navigate(module.path)}
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

export default PublisherModule;
