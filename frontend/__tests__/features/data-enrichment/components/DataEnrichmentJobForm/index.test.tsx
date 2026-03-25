import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const showSuccessMock = jest.fn();
const modalRenderSpy = jest.fn();

jest.mock('../../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: showSuccessMock }),
}));

jest.mock(
  '../../../../../src/features/data-enrichment/components/DataEnrichmentFormModal',
  () => ({
    DataEnrichmentFormModal: (props: any) => {
      modalRenderSpy(props);
      return (
        <div>
          <div data-testid="modal-open-state">{String(props.isOpen)}</div>
          <div data-testid="modal-edit-mode">{String(props.editMode)}</div>
          <div data-testid="modal-job-id">{props.jobId ?? 'none'}</div>
          <div data-testid="modal-job-type">{props.jobType ?? 'none'}</div>
          <button data-testid="save-btn" onClick={props.onSave}>
            save
          </button>
          <button data-testid="close-btn" onClick={props.onClose}>
            close
          </button>
        </div>
      );
    },
  })
);

import DataEnrichmentJobForm from '../../../../../src/features/data-enrichment/components/DataEnrichmentJobForm';

describe('features/data-enrichment/components/DataEnrichmentJobForm/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes edit props when editFormData exists and handles save', () => {
    const onJobCreated = jest.fn();

    render(
      <DataEnrichmentJobForm
        onJobCreated={onJobCreated}
        editFormData={{ id: '123', type: 'pull' } as any}
      />
    );

    expect(screen.getByTestId('modal-open-state')).toHaveTextContent('true');
    expect(screen.getByTestId('modal-edit-mode')).toHaveTextContent('true');
    expect(screen.getByTestId('modal-job-id')).toHaveTextContent('123');
    expect(screen.getByTestId('modal-job-type')).toHaveTextContent('pull');

    fireEvent.click(screen.getByTestId('save-btn'));
    expect(onJobCreated).toHaveBeenCalledTimes(1);
    expect(showSuccessMock).toHaveBeenCalledWith('Job created successfully!');
  });

  it('handles close and supports missing optional callbacks', () => {
    const onCancel = jest.fn();

    const { rerender } = render(<DataEnrichmentJobForm onCancel={onCancel} />);
    expect(screen.getByTestId('modal-edit-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('modal-job-id')).toHaveTextContent('none');
    expect(screen.getByTestId('modal-job-type')).toHaveTextContent('none');

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(<DataEnrichmentJobForm />);
    fireEvent.click(screen.getByTestId('save-btn'));
    fireEvent.click(screen.getByTestId('close-btn'));

    expect(showSuccessMock).toHaveBeenCalledWith('Job created successfully!');
    expect(modalRenderSpy).toHaveBeenCalled();
  });
});