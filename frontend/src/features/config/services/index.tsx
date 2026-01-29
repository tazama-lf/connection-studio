import React from 'react';
import { ClockIcon, ListIcon } from 'lucide-react';
import type { TabType, CronTabNavigationProps } from '../../cron/types/index';

export const CronTabNavigation: React.FC<CronTabNavigationProps> = ({
  activeTab,
  setActiveTab
}) => {
  const tabs = [{
    id: 'create',
    label: 'Create Job',
    icon: <ClockIcon size={18} data-id="element-150" />
  }, {
    id: 'manage',
    label: 'Manage Jobs',
    icon: <ListIcon size={18} data-id="element-151" />
  }];
  return <div className="border-b border-gray-200" data-id="element-152">
      <nav className="flex -mb-px space-x-8" data-id="element-153">
        {tabs.map(tab => <button key={tab.id} className={`
              flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `} onClick={() => setActiveTab(tab.id as TabType)} data-id="element-154">
            <span className="mr-2" data-id="element-155">{tab.icon}</span>
            {tab.label}
          </button>)}
      </nav>
    </div>;
};