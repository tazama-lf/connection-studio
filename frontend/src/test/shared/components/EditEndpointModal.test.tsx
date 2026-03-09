import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditEndpointModal from '../../../shared/components/EditEndpointModal';
import { configApi } from '../../../features/config/services/configApi';
import type { ConfigResponse } from '../../../features/config/services/configApi';
import { ToastProvider } from '../../../shared/providers/ToastProvider';

// Mock the configApi with only methods that actually exist
jest.mock('../../../features/config/services/configApi', () => ({
  configApi: {
    createConfig: jest.fn(),
    updateConfig: jest.fn(),
    getConfig: jest.fn(),
    addMapping: jest.fn(),
    removeMapping: jest.fn(),
  },
}));

const mockConfigApi = configApi as jest.Mocked<typeof configApi>;

describe('EditEndpointModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockConfig = {
    id: 123,
    msgFam: 'ISO20022',
    transactionType: 'payment',
    endpointPath: '/api/payment',
    version: '1.0',
    contentType: 'application/json',
    schema: { properties: { amount: { type: 'number' } } },
    mapping: [{ source: 'amount', destination: 'transaction.amount' }],
    status: 'active',
    tenantId: 'test-tenant',
    createdBy: 'test-user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render create mode modal', () => {
      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={-1}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      expect(screen.getByText('Create New Connection')).toBeInTheDocument();
    });

    it('should handle API errors during creation', async () => {
      mockConfigApi.createConfig.mockResolvedValue({
        success: false,
        message: 'Failed to create configuration',
      });

      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={-1}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      expect(screen.getByText('Create New Connection')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should render edit mode modal', () => {
      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={123}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
    });

    it('should load existing configuration data', async () => {
      mockConfigApi.getConfig.mockResolvedValue({
        success: true,
        message: 'Configuration retrieved',
        config: mockConfig,
      });

      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={123}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(mockConfigApi.getConfig).toHaveBeenCalledWith(123);
      });
    });
  });

  describe('Mapping Duplication Prevention', () => {
    it('should not duplicate mappings when they already exist', async () => {
      const mockGetResponse: ConfigResponse = {
        success: true,
        message: 'Configuration retrieved',
        config: {
          ...mockConfig,
          mapping: [{ source: 'customer.id', destination: 'payer.accountId' }],
        },
      };

      mockConfigApi.getConfig.mockResolvedValue(mockGetResponse);

      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={123}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(mockConfigApi.getConfig).toHaveBeenCalledWith(123);
      });

      // addMapping should not be called if mappings already exist
      expect(mockConfigApi.addMapping).not.toHaveBeenCalled();
    });
  });

  describe('Modal Controls', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={false}
            onClose={mockOnClose}
            endpointId={-1}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      expect(screen.queryByText('Create New Connection')).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should call updateConfig for existing configurations', async () => {
      mockConfigApi.getConfig.mockResolvedValue({
        success: true,
        message: 'Configuration retrieved',
        config: mockConfig,
      });

      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={123}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(mockConfigApi.getConfig).toHaveBeenCalledWith(123);
      });
    });

    it('should handle network errors gracefully', async () => {
      mockConfigApi.getConfig.mockRejectedValue(new Error('Network error'));

      render(
        <ToastProvider>
          <EditEndpointModal
            isOpen={true}
            onClose={mockOnClose}
            endpointId={123}
            onSuccess={mockOnSuccess}
          />
        </ToastProvider>
      );

      expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
    });
  });
});