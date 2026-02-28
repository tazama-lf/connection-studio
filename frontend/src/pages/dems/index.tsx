import React, { useEffect, useState } from 'react';
import { ConfigList } from '@features/config/components/ConfigList';
import VersionHistoryModal from '@features/config/components/VersionHistoryModal';
import { Button } from '@shared/components/Button';
import * as yup from 'yup';
import {
  PlusIcon,
  ChevronLeft,
  ActivityIcon,
  XIcon,
  LassoSelect,
  Circle,
  CheckCircleIcon,
  XCircle,
  DatabaseIcon,
  ServerIcon,
  FolderTreeIcon,
  FolderIcon,
  FileIcon,
} from 'lucide-react';
import EditEndpointModal from '@shared/components/EditEndpointModal';
import ValidationLogsTable from '@shared/components/ValidationLogsTable';
import type { Config } from '@features/config/index';
import { useNavigate } from 'react-router';
import { Backdrop, Box, Grid, Button as MuiButton, CircularProgress } from '@mui/material';
import { dataModelApi, type DestinationOption } from '@features/data-model';
import { useToast } from '@shared/providers/ToastProvider';
import { useForm } from 'react-hook-form';
import {
  AlphaNumericInputField,
  SelectField,
  // @ts-ignore - FormFields is a .jsx file without TypeScript declarations
} from '@shared/components/FormFields';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  type?: string;
  path: string[];
  collection_id?: number | null;
  serial_no?: number | null;
}

export const defaultValues = {
  destination: '',
  destinationType: '',
  destination_name: '',
  field_type: '',
  immediate_parent: '',
  parent_destination: '',
};

type DestinationFormValues = typeof defaultValues;

// Validation schema for step 1 - Select Destination
const step1ValidationSchema = yup.object({
  destination: yup
    .string()
    .required('Please select a destination type')
    .oneOf(['data-model', 'data-cache'], 'Invalid destination type'),
});

// Validation schema for step 2 - Select Destination Type
const step2ValidationSchema = yup.object({
  destination: yup.string().required(),
  destinationType: yup
    .string()
    .required('Please select a destination type')
    .test('valid-type', 'Invalid destination type', function (value) {
      const { destination } = this.parent;
      if (destination === 'data-model') {
        return ['immediate-parent', 'parent', 'child'].includes(value);
      }
      return ['parent', 'child'].includes(value);
    }),
});

// Validation schema for step 3 - Configure Destination Details
const step3ValidationSchema = yup.object({
  destination_name: yup
    .string()
    .required('Destination name is required')
    .min(2, 'Destination name must be at least 2 characters')
    .max(50, 'Destination name cannot exceed 50 characters')
    .matches(
      /^[a-zA-Z][a-zA-Z0-9-]*$/,
      'Must start with a letter and contain only letters, numbers'
    )
    .trim(),
  immediate_parent: yup.string().when('destinationType', {
    is: (val: any) => val !== 'immediate-parent',
    then: (schema) => schema.required('Please select an immediate parent'),
    otherwise: (schema) => schema.nullable(),
  }),
  field_type: yup
    .string()
    .required('Field type is required')
    .oneOf(['string', 'number', 'object'], 'Invalid field type'),
});

// DEMS Module now uses real backend configurations instead of mock data
const DEMSModule: React.FC = () => {
  const navigate = useNavigate();
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(
    null,
  );
  const [showValidationLogs, setShowValidationLogs] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInCloneMode, setIsInCloneMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isCloneCheck, setIsCloneCheck] = useState(false);

  // State for dynamic destination tree from API
  const [destinationTree, setDestinationTree] = useState<TreeNode[]>([]);
  const [addDestinationStep, setAddDestinationStep] = React.useState<number>(0);
  const [showAddDestination, setShowAddDestination] = React.useState(false);
  const [destinationForm, setDestinationForm] = React.useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const { control, handleSubmit, watch, setValue, getValues, reset, setError, clearErrors, formState: { errors } } =
    useForm<DestinationFormValues>({
      defaultValues,
      mode: 'onChange',
    });

  const selectedImmediateParent = watch('immediate_parent');

  // Reset parent_destination when immediate_parent changes
  useEffect(() => {
    setValue('parent_destination', '');
  }, [selectedImmediateParent, setValue]);

  // Disable body scroll when any modal is open
  useEffect(() => {
    if (
      showAddDestination ||
      editingEndpointId !== null ||
      showVersionHistoryModal
    ) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddDestination, editingEndpointId, showVersionHistoryModal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDestinationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDestination = () => {
    setShowAddDestination(true);
    setAddDestinationStep(1);
  };

  const handleContinue = async () => {
    // Get current form values
    const formValues = getValues();

    // Validate based on current step
    try {
      if (addDestinationStep === 1) {
        await step1ValidationSchema.validate(formValues, { abortEarly: false });
        clearErrors('destination');
      } else if (addDestinationStep === 2) {
        await step2ValidationSchema.validate(formValues, { abortEarly: false });
        clearErrors('destinationType');
      }
    } catch (error: any) {
      // Set errors from validation
      if (error.inner) {
        error.inner.forEach((err: any) => {
          setError(err.path, { message: err.message });
        });
      }
      return;
    }

    if (addDestinationStep === 2) {
      setValue('destination_name', '');
      setValue('immediate_parent', '');
      setValue('parent_destination', '');
    }

    if (addDestinationStep === 3) {
      return;
    }

    if (
      addDestinationStep === 2 &&
      destinationForm?.destinationType !== 'child'
    ) {
      setValue('field_type', 'object');
    }

    if (
      addDestinationStep === 2 &&
      destinationForm?.destinationType === 'child'
    ) {
      setValue('field_type', 'string');
    }

    setAddDestinationStep((prev) => prev + 1);
    setShowAddDestination(true);
  };

  const handleCloseAddDestinationModal = () => {
    setDestinationForm({});
    setAddDestinationStep(0);
    setShowAddDestination(false);
    reset(); // Reset form fields
  };

  const handleAddDestinationSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Validate step 3 before submitting
      await step3ValidationSchema.validate(data, { abortEarly: false });
      clearErrors();

      // Prepare the API request based on destination type
      const requestImmediateParentPayload: any = {
        collection_type: data.destination_name,
        name: data.destination_name,
        destination_id: 1,
      };

      const requestParentChildPayload: any = {
        name: data.destination_name,
        field_type: data.field_type,
        parent_id: data?.parent_destination || null,
      };

      // Call the API
      const response =
        destinationForm?.destinationType === 'immediate-parent'
          ? await dataModelApi.createImmediateParent(
            requestImmediateParentPayload,
          )
          : await dataModelApi.createParentChildDestination(
            Number(data?.immediate_parent),
            requestParentChildPayload,
          );

      if (response?.success) {
        // Refresh destination tree
        await fetchDestinationOptions();
        // Close modal
        handleCloseAddDestinationModal();
        // Show success message
        showSuccess('Success', 'Destination added successfully');
      } else {
        console.error('❌ Failed to add destination:', response.message);
        // Show error message
        showError('Error', response.message || 'Failed to add destination');
      }
    } catch (error: any) {
      console.error('❌ Error adding destination:', error);

      // Handle validation errors
      if (error.inner) {
        error.inner.forEach((err: any) => {
          setError(err.path, { message: err.message });
        });
        return;
      }

      // Show API error message
      showError('Error', error?.message || 'An error occurred while adding destination');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setAddDestinationStep((prevStep) => prevStep - 1);
    setShowAddDestination(true);
    clearErrors();
  };

  const convertDestinationOptionsToTree = (
    options: DestinationOption[],
  ): TreeNode[] => {
    // Group options by collection
    const collections = new Map<string, DestinationOption[]>();

    options.forEach((option) => {
      const existing = collections.get(option.collection) || [];
      existing.push(option);
      collections.set(option.collection, existing);
    });

    // Sort so redis goes at the end
    const sortedCollections = Array.from(collections.entries()).sort(
      ([a], [b]) => {
        if (a === 'redis') return 1;
        if (b === 'redis') return -1;
        return a.localeCompare(b);
      },
    );

    console.log("SORTEDDDDDDDDD======================+++++++++", sortedCollections)

    // Build nested tree
    const buildNestedTree = (
      collectionName: string,
      fields: DestinationOption[],
      collection_id: number | null,
    ): TreeNode[] => {
      const rootMap = new Map<
        string,
        { node: TreeNode; children: Map<string, any> }
      >();

      fields.forEach((field) => {
        const parts = field.field ? field.field.split('.') : '';
        let currentLevel = rootMap;
        let currentPath: string[] = [collectionName];

        parts && parts.forEach((part, index) => {
          const isLeaf = index === parts.length - 1 && field.type;
          currentPath = [...currentPath, part];
          const pathKey = parts.slice(0, index + 1).join('.');
          const fullPath = `${collectionName}.${pathKey}`;

          if (!currentLevel.has(part)) {
            currentLevel.set(part, {
              node: {
                id: isLeaf ? field.value : fullPath,
                name: part,
                path: [...currentPath],
                type: isLeaf ? field.type.toLowerCase() : 'object',
                collection_id, // <-- ADD COLLECTION ID
                serial_no: isLeaf ? field.serial_no : null, // <-- ADD SERIAL ID
              },
              children: new Map(),
            });
          } else if (isLeaf) {
            const existing = currentLevel.get(part)!;
            existing.node.id = field.value;
            existing.node.type = field.type.toLowerCase();
            existing.node.serial_no = field.serial_no; // update serial_no for leaf
          }

          const entry = currentLevel.get(part)!;
          currentLevel = entry.children;
        });
      });

      const convertMapToNodes = (map: Map<string, any>): TreeNode[] => Array.from(map.values()).map(({ node, children }) => ({
          ...node,
          children: children.size > 0 ? convertMapToNodes(children) : undefined,
        }));

      return convertMapToNodes(rootMap);
    };

    return sortedCollections.map(([collectionName, fields]) => {
      const collection_id = fields[0]?.collection_id ?? null;

      return {
        id: collectionName,
        name: collectionName.charAt(0).toUpperCase() + collectionName.slice(1),
        path: [collectionName],
        collection_id, // <-- ADD COLLECTION ID on root
        serial_no: null, // root never has serial_no
        children: buildNestedTree(collectionName, fields, collection_id),
      };
    });
  };

  const fetchDestinationOptions = async () => {
    try {
      const response = await dataModelApi.getDestinationOptions();
      // Backend returns {success: true, data: [...]}
      if (response.success && response.data) {

        const treeNodes = convertDestinationOptionsToTree(response.data);
        console.log('response+++++++++++++++++++++++++++++++++++++++++++', treeNodes);
        setDestinationTree(treeNodes);
      } else {
        throw new Error(
          response.message || 'Failed to fetch destination options',
        );
      }
    } catch (error) {
      console.error('Error fetching destination options:', error);

      // Fallback to empty array on error
      setDestinationTree([]);
    } finally {
    }
  };

  // Load destination options from API on mount
  useEffect(() => {
    fetchDestinationOptions();
  }, []);

  // Generate unique collection options from destination tree
  const getImmediateParentOptions = () => destinationTree
      .filter((collection) => {
        if (destinationForm?.destination === 'data-cache') {
          return collection.collection_id === 2;
        }
        if (destinationForm?.destination === 'data-model') {
          return collection.collection_id !== 2;
        }

        return false;
      })
      .map((collection) => ({
        value: collection.collection_id,
        label: collection.name,
      }));

  const getParentDestinationOptions = () => {
    const collection = destinationTree.find(
      (col) => col.collection_id === Number(selectedImmediateParent),
    );

    if (!collection?.children) return [];

    return collection.children
      .filter((child) => child?.type === 'object')
      .map((child) => ({
        value: child.serial_no,
        label: child.name,
      }));
  };

  const handleAddNew = () => {
    setEditingEndpointId(-1);
  };

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setIsInCloneMode(false); // Reset clone mode
    setIsCloneCheck(false); // Reset clone check
    setIsReadOnly(false); // Reset read-only mode
    // Refresh the config list when modal closes
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey((prev) => prev + 1);
  };

  const handleViewDetails = (config: Config) => {
    // Open EditEndpointModal in read-only mode for viewing
    setEditingEndpointId(config.id);
    setIsReadOnly(true);
  };

  const handleEditConfig = (config: Config) => {
    // Open EditEndpointModal in edit mode
    setEditingEndpointId(config.id);
    setIsReadOnly(false);
    setIsCloneCheck(false); // Ensure clone check is false for edit mode
  };

  const handleCloneConfig = (config: Config) => {
    // Set the editing ID to trigger EditEndpointModal with clone mode
    setEditingEndpointId(config.id);
    setIsInCloneMode(true);
    setIsCloneCheck(true);
  };

  const handleViewHistory = (config: Config) => {
    setSelectedConfig(config);
    setShowVersionHistoryModal(true);
  };

  const handleCloseVersionHistoryModal = () => {
    setShowVersionHistoryModal(false);
    setSelectedConfig(null);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className=" mx-auto px-4 sm:px-6 lg:px-12 py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={async () => { await navigate(-1); }}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <ActivityIcon size={28} style={{ color: '#3b82f6' }} />
              Dynamic Event Monitoring Service
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleAddDestination}
              icon={<PlusIcon size={16} />}
            >
              Extend Data Model
            </Button>
            <Button onClick={handleAddNew} icon={<PlusIcon size={16} />}>
              Create New Connection
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {showValidationLogs ? (
          <ValidationLogsTable />
        ) : (
          <ConfigList
            key={refreshKey}
            searchTerm={searchTerm}
            onViewDetails={handleViewDetails}
            onConfigEdit={handleEditConfig}
            onConfigClone={handleCloneConfig}
            onViewHistory={handleViewHistory}
            onRefresh={handleRefresh}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {editingEndpointId !== null && (
        <EditEndpointModal
          isOpen={editingEndpointId !== null}
          onClose={handleCloseModal}
          endpointId={editingEndpointId}
          onSuccess={handleConfigSuccess}
          isCloneMode={isInCloneMode}
          isCloneCheck={isCloneCheck}
          setIsInCloneMode={setIsInCloneMode}
          readOnly={isReadOnly}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && selectedConfig && (
        <VersionHistoryModal
          isOpen={showVersionHistoryModal}
          onClose={handleCloseVersionHistoryModal}
          config={selectedConfig}
        />
      )}

      {showAddDestination && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-id="element-1046"
          style={{ overflow: 'hidden' }}
        >
          <Backdrop
            sx={(theme) => ({
              zIndex: theme.zIndex.drawer + 1,
              overflow: 'hidden',
            })}
            open={true}
          >
            <div className="bg-white rounded-lg w-full max-w-4xl overflow-hidden relative z-10 shadow-2xl">
              <div
                className="flex justify-between items-center px-6 py-4 border-b border-gray-200"
                data-id="element-1048"
              >
                <Box
                  sx={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#2b7fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <span className=' mr-1'>Extend Data Model</span>
                  {addDestinationStep >= 1 && destinationForm?.destination && (
                    <>
                      <span className="text-[#6b7280]" style={{ fontSize: '12px', fontWeight: 'normal' }}>
                        {' '}{'>'}{' '}
                      </span>
                      <span className="text-[#6b7280]" style={{ fontSize: '12px', fontWeight: 'normal' }}>
                        {destinationForm.destination === 'data-model' ? 'Data Model' : 'Data Cache'}
                      </span>
                    </>
                  )}
                  {addDestinationStep >= 2 && destinationForm?.destinationType && (
                    <>
                      <span className="text-[#6b7280]" style={{ fontSize: '12px', fontWeight: 'normal' }}>
                        {' '}{'>'}{' '}
                      </span>
                      <span className="text-[#6b7280]" style={{ fontSize: '12px', fontWeight: 'normal' }}>
                        {destinationForm.destinationType === 'immediate-parent'
                          ? 'Immediate Parent'
                          : destinationForm.destinationType === 'parent'
                            ? 'Parent'
                            : 'Child'}
                      </span>
                    </>
                  )}
                </Box>
                <button
                  onClick={() => { setShowAddDestination(false); }}
                  className="text-gray-500 hover:text-gray-700"
                  data-id="element-1050"
                >
                  <XIcon size={24} data-id="element-1051" />
                </button>
              </div>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '400px',
                  padding: 6,
                }}
              >
                {addDestinationStep === 1 && (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        fontSize: {
                          xs: '20px',
                          sm: '24px',
                          md: '28px',
                        },
                        fontWeight: 'bold',
                        color: '#3b3b3b',
                        marginBottom: 4,
                      }}
                    >
                      Please Select Destination
                      <Box
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                        }}
                      >
                        <LassoSelect size={28} color="#36ce9f" />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: '1fr 1fr',
                        },
                        gap: 4,
                        width: '100%',
                        maxWidth: '700px',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {/* Data Model Box */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 3,
                          border: `2px solid ${destinationForm?.destination === 'data-model' ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: 2,
                          backgroundColor:
                            destinationForm?.destination === 'data-model'
                              ? '#eff6ff'
                              : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            backgroundColor: '#eff6ff',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                          },
                        }}
                        onClick={() => {
                          setDestinationForm((prev) => ({
                            ...prev,
                            destination: 'data-model',
                          }));
                          setValue('destination', 'data-model');
                          clearErrors('destination');
                        }}
                      >
                        {/* Hidden radio input */}
                        <input
                          type="radio"
                          name="destinationType"
                          value="data-model"
                          checked={
                            destinationForm?.destination === 'data-model'
                          }
                          onChange={handleInputChange}
                          style={{ display: 'none' }}
                        />

                        {/* Selection circle */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                          }}
                        >
                          {destinationForm?.destination === 'data-model' ? (
                            <CheckCircleIcon size={20} color="#3b82f6" />
                          ) : (
                            <Circle size={20} color="#d1d5db" />
                          )}
                        </Box>

                        <DatabaseIcon size={48} color="#3b82f6" />
                        <Box
                          sx={{
                            marginTop: 2,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#374151',
                          }}
                        >
                          DATA MODEL
                        </Box>
                        <Box
                          sx={{
                            marginTop: 1,
                            fontSize: '12px',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.4,
                          }}
                        >
                          Data Model Destination receives data directly from
                          source without any parent destination.
                        </Box>
                      </Box>

                      {/* Data Cache Box */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 3,
                          border: `2px solid ${destinationForm?.destination === 'data-cache' ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: 2,
                          backgroundColor:
                            destinationForm?.destination === 'data-cache'
                              ? '#eff6ff'
                              : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            backgroundColor: '#eff6ff',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                          },
                        }}
                        onClick={() => {
                          setDestinationForm((prev) => ({
                            ...prev,
                            destination: 'data-cache',
                          }));
                          setValue('destination', 'data-cache');
                          clearErrors('destination');
                        }}
                      >
                        {/* Hidden radio input */}
                        <input
                          type="radio"
                          name="destinationType"
                          value="data-cache"
                          checked={
                            destinationForm?.destination === 'data-cache'
                          }
                          onChange={handleInputChange}
                          style={{ display: 'none' }}
                        />

                        {/* Selection circle */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                          }}
                        >
                          {destinationForm?.destination === 'data-cache' ? (
                            <CheckCircleIcon size={20} color="#3b82f6" />
                          ) : (
                            <Circle size={20} color="#d1d5db" />
                          )}
                        </Box>

                        <ServerIcon size={48} color="#3b82f6" />
                        <Box
                          sx={{
                            marginTop: 2,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#374151',
                          }}
                        >
                          DATA CACHE
                        </Box>
                        <Box
                          sx={{
                            marginTop: 1,
                            fontSize: '12px',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.4,
                          }}
                        >
                          Data Cache Destination is assigned to parent
                          destination and receives data directly.
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}

                {addDestinationStep === 2 && (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        fontSize: {
                          xs: '20px',
                          sm: '24px',
                          md: '28px',
                        },
                        fontWeight: 'bold',
                        color: '#3b3b3b',
                        marginBottom: 4,
                      }}
                    >
                      Please Select Destination Type
                      <Box
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                        }}
                      >
                        <LassoSelect size={28} color="#36ce9f" />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm:
                            destinationForm?.destination === 'data-model'
                              ? '1fr 1fr 1fr'
                              : '1fr 1fr',
                        },
                        gap: 4,
                        width: '100%',
                        maxWidth:
                          destinationForm?.destination !== 'data-model'
                            ? '700px'
                            : undefined,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {/* Immediate Parent Box */}
                      {destinationForm?.destination === 'data-model' && (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 3,
                            border: `2px solid ${destinationForm?.destinationType === 'immediate-parent' ? '#3b82f6' : '#e5e7eb'}`,
                            borderRadius: 2,
                            backgroundColor:
                              destinationForm?.destinationType ===
                                'immediate-parent'
                                ? '#eff6ff'
                                : '#f8fafc',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease-in-out',
                            position: 'relative',
                            '&:hover': {
                              borderColor: '#3b82f6',
                              backgroundColor: '#eff6ff',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                            },
                          }}
                          onClick={() => {
                            setDestinationForm((prev) => ({
                              ...prev,
                              destinationType: 'immediate-parent',
                            }));
                            setValue('destinationType', 'immediate-parent');
                            clearErrors('destinationType');
                          }}
                        >
                          {/* Hidden radio input */}
                          <input
                            type="radio"
                            name="destinationType"
                            value="immediate-parent"
                            checked={
                              destinationForm?.destinationType ===
                              'immediate-parent'
                            }
                            onChange={handleInputChange}
                            style={{ display: 'none' }}
                          />

                          {/* Selection circle */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 16,
                              right: 16,
                            }}
                          >
                            {destinationForm?.destinationType ===
                              'immediate-parent' ? (
                              <CheckCircleIcon size={20} color="#3b82f6" />
                            ) : (
                              <Circle size={20} color="#d1d5db" />
                            )}
                          </Box>

                          <FolderTreeIcon size={48} color="#3b82f6" />
                          <Box
                            sx={{
                              marginTop: 2,
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#374151',
                            }}
                          >
                            IMMEDIATE PARENT
                          </Box>
                          <Box
                            sx={{
                              marginTop: 1,
                              fontSize: '12px',
                              color: '#6b7280',
                              textAlign: 'center',
                              lineHeight: 1.4,
                            }}
                          >
                            Immediate Parent Destination receives data directly
                            from source without any parent destination.
                          </Box>
                        </Box>
                      )}
                      {/* Parent Box */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 3,
                          border: `2px solid ${destinationForm?.destinationType === 'parent' ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: 2,
                          backgroundColor:
                            destinationForm?.destinationType === 'parent'
                              ? '#eff6ff'
                              : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            backgroundColor: '#eff6ff',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                          },
                        }}
                        onClick={() => {
                          setDestinationForm((prev) => ({
                            ...prev,
                            destinationType: 'parent',
                          }));
                          setValue('destinationType', 'parent');
                          clearErrors('destinationType');
                        }}
                      >
                        {/* Hidden radio input */}
                        <input
                          type="radio"
                          name="destinationType"
                          value="parent"
                          checked={
                            destinationForm?.destinationType === 'parent'
                          }
                          onChange={handleInputChange}
                          style={{ display: 'none' }}
                        />

                        {/* Selection circle */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                          }}
                        >
                          {destinationForm?.destinationType === 'parent' ? (
                            <CheckCircleIcon size={20} color="#3b82f6" />
                          ) : (
                            <Circle size={20} color="#d1d5db" />
                          )}
                        </Box>

                        <FolderIcon size={48} color="#3b82f6" />
                        <Box
                          sx={{
                            marginTop: 2,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#374151',
                          }}
                        >
                          PARENT
                        </Box>
                        <Box
                          sx={{
                            marginTop: 1,
                            fontSize: '12px',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.4,
                          }}
                        >
                          Parent Destination is used to group multiple child
                          destinations under a single entity.
                        </Box>
                      </Box>

                      {/* Child Box */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 3,
                          border: `2px solid ${destinationForm?.destinationType === 'child' ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: 2,
                          backgroundColor:
                            destinationForm?.destinationType === 'child'
                              ? '#eff6ff'
                              : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            backgroundColor: '#eff6ff',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                          },
                        }}
                        onClick={() => {
                          setDestinationForm((prev) => ({
                            ...prev,
                            destinationType: 'child',
                          }));
                          setValue('destinationType', 'child');
                          clearErrors('destinationType');
                        }}
                      >
                        {/* Hidden radio input */}
                        <input
                          type="radio"
                          name="destinationType"
                          value="child"
                          checked={destinationForm?.destinationType === 'child'}
                          onChange={handleInputChange}
                          style={{ display: 'none' }}
                        />

                        {/* Selection circle */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                          }}
                        >
                          {destinationForm?.destinationType === 'child' ? (
                            <CheckCircleIcon size={20} color="#3b82f6" />
                          ) : (
                            <Circle size={20} color="#d1d5db" />
                          )}
                        </Box>

                        <FileIcon size={48} color="#3b82f6" />
                        <Box
                          sx={{
                            marginTop: 2,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#374151',
                          }}
                        >
                          CHILD
                        </Box>
                        <Box
                          sx={{
                            marginTop: 1,
                            fontSize: '12px',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.4,
                          }}
                        >
                          Child Destination is assigned to parent destination
                          and receives data directly.
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}

                {addDestinationStep === 3 && (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        fontSize: {
                          xs: '20px',
                          sm: '24px',
                          md: '28px',
                        },
                        fontWeight: 'bold',
                        color: '#3b3b3b',
                        marginBottom: 4,
                      }}
                    >
                      Configure Destination Detail
                      <Box
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                        }}
                      >
                        <LassoSelect size={28} color="#36ce9f" />
                      </Box>
                    </Box>
                    <form
                      className=" w-full"
                      onSubmit={handleSubmit(handleAddDestinationSubmit)}
                    // className="space-y-2"
                    >
                      <div data-id="element-818">
                        <Grid container spacing={2}>
                          {destinationForm?.destinationType !==
                            'immediate-parent' && (
                              <Grid
                                size={{
                                  xs: 12,
                                  md: 6,
                                }}
                              >
                                <SelectField
                                  name="immediate_parent"
                                  label="Select Immediate Parent"
                                  control={control}
                                  placeholder="Select immediate parent"
                                  options={getImmediateParentOptions()}
                                />
                                {errors.immediate_parent && (
                                  <p className="text-red-600 text-sm mt-1 ml-1">
                                    {errors.immediate_parent.message}
                                  </p>
                                )}
                              </Grid>
                            )}

                          {destinationForm?.destinationType === 'child' && (
                            <Grid
                              size={{
                                xs: 12,
                                md: 6,
                              }}
                            >
                              <SelectField
                                name="parent_destination"
                                label="Select Parent Destination (Optional)"
                                control={control}
                                placeholder="Select parent destination"
                                options={getParentDestinationOptions()}
                                disabled={
                                  !selectedImmediateParent ||
                                  !getParentDestinationOptions().length
                                }
                              />
                              {errors.parent_destination && (
                                <p className="text-red-600 text-sm mt-1 ml-1">
                                  {errors.parent_destination.message}
                                </p>
                              )}
                            </Grid>
                          )}

                          {/* Destination Name */}
                          <Grid
                            size={{
                              xs: 12,
                              md: 6,
                            }}
                          >
                            <AlphaNumericInputField
                              name="destination_name"
                              label="Destination Name"
                              control={control}
                              placeholder="Enter destination name"
                              maxLength={50}
                            />
                            {errors.destination_name && (
                              <p className="text-red-600 text-sm mt-1 ml-1">
                                {errors.destination_name.message}
                              </p>
                            )}
                          </Grid>

                          {/* Field Type */}
                          <Grid
                            size={{
                              xs: 12,
                              md: 6,
                            }}
                          >
                            <SelectField
                              name="field_type"
                              label="Field Type"
                              control={control}
                              placeholder="Select field type"
                              options={
                                destinationForm?.destinationType === 'child'
                                  ? [
                                    { value: 'string', label: 'String' },
                                    { value: 'number', label: 'Number' },
                                  ]
                                  : [{ value: 'object', label: 'Object' }]
                              }
                              disabled={
                                destinationForm?.destinationType !== 'child'
                              }
                            />
                            {errors.field_type && (
                              <p className="text-red-600 text-sm mt-1 ml-1">
                                {errors.field_type.message}
                              </p>
                            )}
                          </Grid>
                        </Grid>
                      </div>
                    </form>
                  </>
                )}
              </Box>
              <div className="px-6 py-3 border-t border-gray-200 flex justify-between sticky bottom-0 bg-white z-10">
                <MuiButton
                  onClick={handleCloseAddDestinationModal}
                  type="button"
                  variant="outlined"
                  sx={{ marginRight: '10px' }}
                  startIcon={<XCircle size={16} />}
                >
                  Cancel
                </MuiButton>
                <Box>
                  {addDestinationStep !== 1 && (
                    <MuiButton
                      variant="outlined"
                      sx={{ marginRight: '10px' }}
                      onClick={handleBack}
                    >
                      Back
                    </MuiButton>
                  )}
                  <MuiButton
                    variant="contained"
                    sx={{ background: '#2b7fff' }}
                    onClick={
                      addDestinationStep === 3
                        ? handleSubmit(handleAddDestinationSubmit)
                        : handleContinue
                    }
                    disabled={
                      isSubmitting ||
                      (addDestinationStep === 1 && !destinationForm?.destination) ||
                      (addDestinationStep === 2 && !destinationForm?.destinationType)
                    }
                    startIcon={isSubmitting && addDestinationStep === 3 ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    {addDestinationStep === 3 ? (isSubmitting ? 'Submitting...' : 'Submit') : 'Continue'}
                  </MuiButton>
                </Box>
              </div>
            </div>
          </Backdrop>

          {/* Loading Backdrop */}
          <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 2 }}
            open={isSubmitting}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </div>
      )}
    </div>
  );
};

export default DEMSModule;
