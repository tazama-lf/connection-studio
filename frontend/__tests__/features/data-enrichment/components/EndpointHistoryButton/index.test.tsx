import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateMock = jest.fn();
const handleNavigateToHistoryMock = jest.fn();

jest.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

jest.mock(
  '@shared',
  () => ({
    Button: (props: any) => (
      <button data-testid="shared-button" onClick={props.onClick}>
        {props.children}
      </button>
    ),
  }),
  { virtual: true },
);

jest.mock('lucide-react', () => ({
  EyeIcon: () => <span data-testid="eye-icon" />,
}));

jest.mock('../../../../../src/features/data-enrichment/handlers', () => ({
  handleNavigateToHistory: (...args: any[]) =>
    handleNavigateToHistoryMock(...args),
}));

jest.mock('../../../../../src/shared/config/routes.config', () => ({
  ROUTES: {
    DATA_ENRICHMENT_HISTORY: '/history-route',
  },
}));

import EndpointHistoryButton from '../../../../../src/features/data-enrichment/components/EndpointHistoryButton';

describe('features/data-enrichment/components/EndpointHistoryButton/index.tsx', () => {
  it('renders label and icon', () => {
    render(<EndpointHistoryButton jobId="job-1" />);

    expect(screen.getByText('View Endpoint Last Runs')).toBeInTheDocument();
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });

  it('navigates to endpoint history on click', () => {
    render(<EndpointHistoryButton jobId="job-42" />);

    fireEvent.click(screen.getByTestId('shared-button'));

    expect(handleNavigateToHistoryMock).toHaveBeenCalledWith(
      navigateMock,
      'job-42',
      '/history-route',
    );
  });
});
