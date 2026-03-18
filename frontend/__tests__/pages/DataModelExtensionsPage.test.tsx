import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataModelExtensionsPage } from '../../src/pages/DataModelExtensionsPage';

jest.mock('../../../src/features/data-model', () => ({
  ExtensionManagement: ({ onExtensionChange }: { onExtensionChange: () => void }) => (
    <div data-testid="extension-management">
      ExtensionManagement Mock
      <button onClick={onExtensionChange}>trigger-extension-change</button>
    </div>
  ),
  dataModelApi: {
    getAllExtensions: jest.fn(),
    createExtension: jest.fn(),
  },
}));

describe('DataModelExtensionsPage', () => {
  it('renders the page heading', () => {
    render(<DataModelExtensionsPage />);
    expect(screen.getByText('Data Model Extensions')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<DataModelExtensionsPage />);
    expect(
      screen.getByText(/Extend the Tazama data model with custom fields/i),
    ).toBeInTheDocument();
  });

  it('renders the ExtensionManagement component', () => {
    render(<DataModelExtensionsPage />);
    expect(screen.getByTestId('extension-management')).toBeInTheDocument();
  });

  it('renders the "How Data Model Extensions Work" section', () => {
    render(<DataModelExtensionsPage />);
    expect(screen.getByText('How Data Model Extensions Work')).toBeInTheDocument();
  });

  it('renders extension feature bullets', () => {
    render(<DataModelExtensionsPage />);
    expect(screen.getByText(/Custom Fields/)).toBeInTheDocument();
    expect(screen.getByText(/Field Types/)).toBeInTheDocument();
    expect(screen.getByText(/Tenant Isolation/)).toBeInTheDocument();
  });

  it('handles extension change callback from extension management', () => {
    render(<DataModelExtensionsPage />);
    screen.getByText('trigger-extension-change').click();
    expect(screen.getByText('Data Model Extensions')).toBeInTheDocument();
  });
});
