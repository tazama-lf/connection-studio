// PublisherModule.test.tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PublisherModule from '../../../../src/features/publisher/pages/PublisherModule';
import { useNavigate } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  Clock: ({ size }: any) => <svg data-testid="clock-icon" data-size={size} />,
  Database: ({ size }: any) => (
    <svg data-testid="database-icon" data-size={size} />
  ),
  Settings: ({ size }: any) => (
    <svg data-testid="settings-icon" data-size={size} />
  ),
  PackageOpen: ({ size }: any) => (
    <svg data-testid="package-open-icon" data-size={size} />
  ),
}));

describe('PublisherModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockNavigate.mockResolvedValue(undefined);
  });

  it('renders all publisher module cards', () => {
    render(<PublisherModule />);

    expect(
      screen.getByText('Dynamic Event Monitoring Service'),
    ).toBeInTheDocument();
    expect(screen.getByText('Data Enrichment')).toBeInTheDocument();
    expect(screen.getByText('Cron Job Management')).toBeInTheDocument();
    expect(screen.getByText('Exported Items')).toBeInTheDocument();
  });

  it('renders all module descriptions', () => {
    render(<PublisherModule />);

    expect(
      screen.getByText('Review and publish approved configurations'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Review and publish exported data enrichment jobs'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Review and publish exported cron job schedules'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Review exported items ready for publishing (Cron Jobs, DE Jobs, DEMS)',
      ),
    ).toBeInTheDocument();
  });

  it('renders all module icons', () => {
    render(<PublisherModule />);

    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    expect(screen.getByTestId('database-icon')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('package-open-icon')).toBeInTheDocument();
  });

  it('passes size 24 to all icons', () => {
    render(<PublisherModule />);

    expect(screen.getByTestId('settings-icon')).toHaveAttribute(
      'data-size',
      '24',
    );
    expect(screen.getByTestId('database-icon')).toHaveAttribute(
      'data-size',
      '24',
    );
    expect(screen.getByTestId('clock-icon')).toHaveAttribute('data-size', '24');
    expect(screen.getByTestId('package-open-icon')).toHaveAttribute(
      'data-size',
      '24',
    );
  });

  it('renders four clickable module cards', () => {
    render(<PublisherModule />);

    const demsCard = screen
      .getByText('Dynamic Event Monitoring Service')
      .closest('div[class*="cursor-pointer"]');
    const deCard = screen
      .getByText('Data Enrichment')
      .closest('div[class*="cursor-pointer"]');
    const cronCard = screen
      .getByText('Cron Job Management')
      .closest('div[class*="cursor-pointer"]');
    const exportedItemsCard = screen
      .getByText('Exported Items')
      .closest('div[class*="cursor-pointer"]');

    expect(demsCard).toBeInTheDocument();
    expect(deCard).toBeInTheDocument();
    expect(cronCard).toBeInTheDocument();
    expect(exportedItemsCard).toBeInTheDocument();
  });

  it('navigates to /publisher/configs when Dynamic Event Monitoring Service card is clicked', async () => {
    render(<PublisherModule />);

    const card = screen
      .getByText('Dynamic Event Monitoring Service')
      .closest('div[class*="cursor-pointer"]');

    expect(card).toBeInTheDocument();

    fireEvent.click(card!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/publisher/configs');
    });
  });

  it('navigates to /publisher/de-jobs when Data Enrichment card is clicked', async () => {
    render(<PublisherModule />);

    const card = screen
      .getByText('Data Enrichment')
      .closest('div[class*="cursor-pointer"]');

    expect(card).toBeInTheDocument();

    fireEvent.click(card!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/publisher/de-jobs');
    });
  });

  it('navigates to /publisher/cron-jobs when Cron Job Management card is clicked', async () => {
    render(<PublisherModule />);

    const card = screen
      .getByText('Cron Job Management')
      .closest('div[class*="cursor-pointer"]');

    expect(card).toBeInTheDocument();

    fireEvent.click(card!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/publisher/cron-jobs');
    });
  });

  it('navigates to /publisher/exported-items when Exported Items card is clicked', async () => {
    render(<PublisherModule />);

    const card = screen
      .getByText('Exported Items')
      .closest('div[class*="cursor-pointer"]');

    expect(card).toBeInTheDocument();

    fireEvent.click(card!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/publisher/exported-items');
    });
  });

  it('calls navigate once per click with correct routes in order', async () => {
    render(<PublisherModule />);

    const demsCard = screen
      .getByText('Dynamic Event Monitoring Service')
      .closest('div[class*="cursor-pointer"]');
    const deCard = screen
      .getByText('Data Enrichment')
      .closest('div[class*="cursor-pointer"]');
    const cronCard = screen
      .getByText('Cron Job Management')
      .closest('div[class*="cursor-pointer"]');
    const exportedItemsCard = screen
      .getByText('Exported Items')
      .closest('div[class*="cursor-pointer"]');

    fireEvent.click(demsCard!);
    fireEvent.click(deCard!);
    fireEvent.click(cronCard!);
    fireEvent.click(exportedItemsCard!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(4);
    });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/publisher/configs');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/publisher/de-jobs');
    expect(mockNavigate).toHaveBeenNthCalledWith(3, '/publisher/cron-jobs');
    expect(mockNavigate).toHaveBeenNthCalledWith(
      4,
      '/publisher/exported-items',
    );
  });

  it('renders the main container layout', () => {
    const { container } = render(<PublisherModule />);

    expect(container.firstChild).toHaveClass('min-h-screen', 'bg-white');
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});
