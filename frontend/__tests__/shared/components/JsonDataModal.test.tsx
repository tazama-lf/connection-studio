import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { JsonDataModal } from '../../../src/shared/components/JsonDataModal';

const mockData = { key: 'value', count: 42, items: [1, 2, 3] };

describe('JsonDataModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <JsonDataModal isOpen={false} onClose={onClose} data={mockData} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={mockData} />);
    expect(screen.getByText('JSON Data')).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(
      <JsonDataModal isOpen={true} onClose={onClose} data={mockData} title="My Config" />,
    );
    expect(screen.getByText('My Config')).toBeInTheDocument();
  });

  it('uses "JSON Data" as default title', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={mockData} />);
    expect(screen.getByText('JSON Data')).toBeInTheDocument();
  });

  it('renders formatted JSON data', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={mockData} />);
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('"key": "value"');
    expect(pre?.textContent).toContain('"count": 42');
  });

  it('calls onClose when the close button in header is clicked', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={mockData} />);
    // There are two buttons: header X icon and footer Close button
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when footer Close button is clicked', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={mockData} />);
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={mockData} />);
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders null data as JSON', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={null} />);
    expect(screen.getByText('JSON Data')).toBeInTheDocument();
  });

  it('renders array data as JSON', () => {
    render(<JsonDataModal isOpen={true} onClose={onClose} data={[1, 2, 3]} />);
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('1');
  });
});
