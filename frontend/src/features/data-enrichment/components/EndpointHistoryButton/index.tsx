import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@shared';
import { EyeIcon } from 'lucide-react';
import { ROUTES } from '../../../../shared/config/routes.config';
import { handleNavigateToHistory } from '../../handlers';

import type { EndpointHistoryButtonProps } from '../../types';

export const EndpointHistoryButton: React.FC<EndpointHistoryButtonProps> = ({ jobId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    handleNavigateToHistory(navigate, jobId, ROUTES.DATA_ENRICHMENT_HISTORY);
  };

  return (
    <Button variant="primary" className="py-1 pl-2" onClick={handleClick}>
      <EyeIcon size={17} />
      <span style={{ marginLeft: 8 }}>View Endpoint Last Runs</span>
    </Button>
  );
};

export default EndpointHistoryButton;
