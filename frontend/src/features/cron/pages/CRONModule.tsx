import React, { useState } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { CronTabNavigation } from '../components/CronTabNavigation';
import { CronJobForm } from '../components/CronJobForm';
import { CronJobList } from '../components/CronJobList';
type TabType = 'create' | 'manage';
 const CRONModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  return <div className="min-h-screen bg-gray-50" data-id="element-1140">
      <AuthHeader title="CRON Job Scheduler" showBackButton={true} data-id="element-1141" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-id="element-1142">
        <p className="text-gray-600 mb-8" data-id="element-1143">
          Create, manage, and monitor scheduled data jobs
        </p>
        <CronTabNavigation activeTab={activeTab} setActiveTab={setActiveTab} data-id="element-1144" />
        <div className="mt-6" data-id="element-1145">
          {activeTab === 'create' && <CronJobForm data-id="element-1146" />}
          {activeTab === 'manage' && <CronJobList data-id="element-1147" />}
        </div>
      </div>
    </div>;
};

export default CRONModule;