import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@shared';
import { EyeIcon } from 'lucide-react';
import { ROUTES } from '../../../shared/config/routes.config';

interface Props {
  jobId?: string;
}

export const EndpointHistoryButton: React.FC<Props> = ({ jobId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const url = jobId
      ? `${ROUTES.DATA_ENRICHMENT_HISTORY}?jobId=${encodeURIComponent(jobId)}`
      : ROUTES.DATA_ENRICHMENT_HISTORY;
    navigate(url);
  };

  return (
    <Button variant="primary" className="py-1 pl-2" onClick={handleClick}>
      <EyeIcon size={20} />
      <span style={{ marginLeft: 8 }}>View Endpoint Last Runs</span>
    </Button>
  );
};

export default EndpointHistoryButton;
