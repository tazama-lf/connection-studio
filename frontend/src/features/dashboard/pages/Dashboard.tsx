import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ActivityIcon, DatabaseIcon, ClockIcon } from 'lucide-react';
import { NAVIGATION } from '../../../shared/config/routes.config';
import { APP_CONFIG } from '../../../shared/config/app.config';
import { useAuth } from '../../auth/contexts/AuthContext';
// import { isApprover } from '../../../utils/roleUtils';
// import ApproverDashboard from '../../approver/pages/ApproverDashboard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if user is an approver and show approver-specific dashboard
  // if (user && user.claims && isApprover(user.claims)) {
  //   return <ApproverDashboard />;
  // }
  
  const modules = NAVIGATION.mainModules.map(module => ({
    ...module,
    icon: module.icon === 'ActivityIcon' ? <ActivityIcon size={24} /> :
          module.icon === 'DatabaseIcon' ? <DatabaseIcon size={24} /> :
          module.icon === 'ClockIcon' ? <ClockIcon size={24} /> : null,
    action: () => navigate(module.path)
  }));

  return <div className="min-h-screen bg-gray-50" data-id="element-1151">
      <AuthHeader title={APP_CONFIG.name} data-id="element-1152" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-id="element-1153">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6" data-id="element-1154">
          {modules.map(module => <div key={module.id} className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={module.action} data-id="element-1155">
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