import {
  ENDPOINT_STATUS,
  WORKFLOW_STATUS,
  CONFIGURATION_TYPE,
  SOURCE_TYPE,
  FILE_FORMAT,
  TRANSACTION_TYPE,
} from '../../../src/shared/constants';

describe('shared constants', () => {
  it('contains expected endpoint statuses', () => {
    expect(ENDPOINT_STATUS.IN_PROGRESS).toBe('In-Progress');
    expect(ENDPOINT_STATUS.READY_FOR_APPROVAL).toBe('Ready for Approval');
  });

  it('contains expected workflow statuses', () => {
    expect(WORKFLOW_STATUS.ACTIVE).toBe('active');
    expect(WORKFLOW_STATUS.PAUSED).toBe('in-active');
  });

  it('contains expected configuration and source types', () => {
    expect(CONFIGURATION_TYPE.PULL).toBe('pull');
    expect(CONFIGURATION_TYPE.PUSH).toBe('push');
    expect(SOURCE_TYPE.SFTP).toBe('sftp');
    expect(SOURCE_TYPE.HTTP).toBe('http');
  });

  it('contains expected file formats and transaction types', () => {
    expect(FILE_FORMAT.CSV).toBe('csv');
    expect(FILE_FORMAT.JSON).toBe('json');
    expect(FILE_FORMAT.XML).toBe('xml');
    expect(TRANSACTION_TYPE.TRANSFERS).toBe('transfers');
    expect(TRANSACTION_TYPE.PAYMENTS).toBe('payments');
  });
});
