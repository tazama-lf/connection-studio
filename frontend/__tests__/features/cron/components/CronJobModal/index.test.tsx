import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const cronJobFormMock = jest.fn();

jest.mock('@mui/material', () => ({
  Backdrop: ({ children, open, sx }: any) => {
    if (typeof sx === 'function') {
      sx({ zIndex: { drawer: 10 } });
    }
    return open ? <div data-testid="backdrop">{children}</div> : null;
  },
  Box: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../../../../src/features/cron/components/CronJobForm', () => ({
  CronJobForm: (props: any) => {
    cronJobFormMock(props);
    return (
      <div data-testid="cron-form">
        <button onClick={props.onJobCreated}>trigger-create</button>
        <button onClick={props.handleSaveEdit}>trigger-edit-save</button>
        <button onClick={props.handleSendForApproval}>trigger-send-approval</button>
        <button onClick={props.onCancel}>trigger-cancel</button>
      </div>
    );
  },
}));

import CronJobModal from '../../../../../src/features/cron/components/CronJobModal';

describe('features/cron/components/CronJobModal/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when closed', () => {
    const { container } = render(<CronJobModal isOpen={false} onClose={jest.fn()} /> as any);
    expect(container).toBeEmptyDOMElement();
  });

  it('wires create mode and runs onJobCreated then onClose', () => {
    const onClose = jest.fn();
    const onJobCreated = jest.fn();

    render(<CronJobModal isOpen={true} mode="create" onClose={onClose} onJobCreated={onJobCreated} /> as any);

    expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
    fireEvent.click(screen.getByText('trigger-create'));

    expect(onJobCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('wires edit mode and runs handleSaveEdit then onClose', () => {
    const onClose = jest.fn();
    const handleSaveEdit = jest.fn();
    const setEditFormData = jest.fn();

    render(
      <CronJobModal
        isOpen={true}
        mode="edit"
        onClose={onClose}
        editFormData={{ id: 1 } as any}
        setEditFormData={setEditFormData}
        handleSaveEdit={handleSaveEdit}
      /> as any,
    );

    expect(screen.getByText('Edit Cron Job')).toBeInTheDocument();
    fireEvent.click(screen.getByText('trigger-edit-save'));

    expect(handleSaveEdit).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('wires view mode and runs send-for-approval then onClose', () => {
    const onClose = jest.fn();
    const handleSendForApproval = jest.fn();
    const onApprove = jest.fn();
    const onReject = jest.fn();

    render(
      <CronJobModal
        isOpen={true}
        mode="view"
        onClose={onClose}
        viewFormData={{ id: 1 } as any}
        handleSendForApproval={handleSendForApproval}
        onApprove={onApprove}
        onReject={onReject}
      /> as any,
    );

    expect(screen.getByText('View Cron Job')).toBeInTheDocument();
    const props = cronJobFormMock.mock.calls.at(-1)?.[0];
    expect(typeof props?.handleSendForApproval).toBe('function');

    act(() => {
      props.handleSendForApproval();
    });

    expect(handleSendForApproval).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes in view mode even when send-for-approval handler is missing', () => {
    const onClose = jest.fn();

    render(
      <CronJobModal
        isOpen={true}
        mode="view"
        onClose={onClose}
        viewFormData={{ id: 1 } as any}
      /> as any,
    );

    fireEvent.click(screen.getByText('trigger-send-approval'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from header close button and cancel action', () => {
    const onClose = jest.fn();

    const { container } = render(<CronJobModal isOpen={true} onClose={onClose} /> as any);

    const headerCloseButton = container.querySelector('button.text-gray-400') as HTMLButtonElement;
    fireEvent.click(headerCloseButton);
    fireEvent.click(screen.getByText('trigger-cancel'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('handles edit mode when handleSaveEdit is not provided', () => {
    const onClose = jest.fn();

    render(
      <CronJobModal
        isOpen={true}
        mode="edit"
        onClose={onClose}
        editFormData={{ id: 1 } as any}
      /> as any,
    );

    fireEvent.click(screen.getByText('trigger-edit-save'));
    expect(onClose).toHaveBeenCalled();
  });
});