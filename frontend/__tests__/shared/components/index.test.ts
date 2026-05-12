const AuthHeaderMock = { key: 'AuthHeader' };
const ButtonMock = { key: 'Button' };
const EditEndpointModalMock = { key: 'EditEndpointModal' };
const SearchBarMock = { key: 'SearchBar' };
const ValidationLogsTableMock = { key: 'ValidationLogsTable' };
const PayloadEditorMock = { key: 'PayloadEditor' };
const MappingUtilityMock = { key: 'MappingUtility' };
const SimulationPanelMock = { key: 'SimulationPanel' };
const DeploymentConfirmationMock = { key: 'DeploymentConfirmation' };
const DataEnrichmentFormModalMock = { key: 'DataEnrichmentFormModal' };
const JsonDataModalMock = { key: 'JsonDataModal' };
const EndpointHistoryModalMock = { key: 'EndpointHistoryModal' };
const ToastMock = { key: 'Toast' };
const FileCorruptionErrorMock = { key: 'FileCorruptionError' };

jest.mock('../../../src/shared/components/AuthHeader', () => ({ AuthHeader: AuthHeaderMock }));
jest.mock('../../../src/shared/components/Button', () => ({ Button: ButtonMock }));
jest.mock('../../../src/shared/components/EditEndpointModal', () => ({ __esModule: true, default: EditEndpointModalMock }));
jest.mock('../../../src/shared/components/SearchBar', () => ({ __esModule: true, default: SearchBarMock }));
jest.mock('../../../src/shared/components/ValidationLogsTable', () => ({ __esModule: true, default: ValidationLogsTableMock }));
jest.mock('../../../src/shared/components/PayloadEditor', () => ({ PayloadEditor: PayloadEditorMock }));
jest.mock('../../../src/shared/components/MappingUtility', () => ({ MappingUtility: MappingUtilityMock }));
jest.mock('../../../src/shared/components/SimulationPanel', () => ({ SimulationPanel: SimulationPanelMock }));
jest.mock('../../../src/shared/components/DeploymentConfirmation', () => ({ DeploymentConfirmation: DeploymentConfirmationMock }));
jest.mock('../../../src/features/data-enrichment/components/DataEnrichmentFormModal', () => ({ DataEnrichmentFormModal: DataEnrichmentFormModalMock }));
jest.mock('../../../src/shared/components/JsonDataModal', () => ({ JsonDataModal: JsonDataModalMock }));
jest.mock('../../../src/shared/components/EndpointHistoryModal', () => ({ EndpointHistoryModal: EndpointHistoryModalMock }));
jest.mock('../../../src/shared/components/Toast', () => ({ __esModule: true, default: ToastMock }));
jest.mock('../../../src/shared/components/FileCorruptionError', () => ({ FileCorruptionError: FileCorruptionErrorMock }));

import * as SharedComponents from '../../../src/shared/components';

describe('shared/components/index.ts', () => {
  it('re-exports shared components from barrel', () => {
    expect(SharedComponents.AuthHeader).toBe(AuthHeaderMock);
    expect(SharedComponents.Button).toBe(ButtonMock);
    expect(SharedComponents.EditEndpointModal).toBe(EditEndpointModalMock);
    expect(SharedComponents.SearchBar).toBe(SearchBarMock);
    expect(SharedComponents.ValidationLogsTable).toBe(ValidationLogsTableMock);
    expect(SharedComponents.PayloadEditor).toBe(PayloadEditorMock);
    expect(SharedComponents.MappingUtility).toBe(MappingUtilityMock);
    expect(SharedComponents.SimulationPanel).toBe(SimulationPanelMock);
    expect(SharedComponents.DeploymentConfirmation).toBe(DeploymentConfirmationMock);
    expect(SharedComponents.DataEnrichmentFormModal).toBe(DataEnrichmentFormModalMock);
    expect(SharedComponents.JsonDataModal).toBe(JsonDataModalMock);
    expect(SharedComponents.EndpointHistoryModal).toBe(EndpointHistoryModalMock);
    expect(SharedComponents.Toast).toBe(ToastMock);
    expect(SharedComponents.FileCorruptionError).toBe(FileCorruptionErrorMock);
  });
});

