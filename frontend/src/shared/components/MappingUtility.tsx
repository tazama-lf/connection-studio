import React, { useState, useEffect } from 'react';
import { ArrowRightIcon, PlusIcon, XIcon, ChevronRightIcon, FolderIcon, DatabaseIcon, ServerIcon } from 'lucide-react';
import { Button } from './Button';
import { configApi, type AddMappingRequest, type FieldMapping } from '../../features/config/services/configApi';
import { dataModelApi, type DestinationOption } from '../../features/data-model';

/**
 * MappingUtility Component - Updated for Tazama Integration
 * 
 * Features implemented:
 * 1. Dynamic source fields from generated payload schema
 * 2. Tazama destination data model (payer, payee, transaction, routing, riskData)
 * 3. Real backend API integration (POST /config/:id/mapping)
 * 4. Proper error handling and user feedback
 * 5. Console logging for debugging
 * 
 * Usage: Select source fields → Select destination fields → Click "Add Mapping"
 * The mapping will be saved to the backend and associated with the config ID.
 */
interface MappingField {
  source: string[];
  destination: string[];
  destinationType: 'database' | 'valkey' | 'model';
  transformFunction: 'concatenate' | 'sum' | 'split' | 'none';
}

interface MappingUtilityProps {
  onMappingChange: (isValid: boolean) => void;
  onMappingDataChange?: (mappingData: MappingData) => void;
  onCurrentMappingsChange?: (mappings: FieldMapping[]) => void; // NEW: Expose current mappings to parent
  onConfigUpdate?: (config: any) => void; // NEW: Callback to update parent config
  sourceSchema?: Array<{
    name: string;
    path: string;
    type: string;
    isRequired: boolean;
  }> | any; // Accept both array format and JSON schema object
  templateType?: string;
  configId?: number; // ID of the configuration to add mappings to
  existingMappings?: FieldMapping[]; // Existing mappings from backend
}

interface MappingData {
  sourceFields: Array<{
    path: string;
    type: string;
    isRequired: boolean;
  }>;
  destinationFields: Array<{
    path: string;
    type: string;
    isRequired: boolean;
  }>;
  transformation: 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT';
  constants: { [key: string]: any };
}
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  type?: string;
  path: string[];
}
export const MappingUtility: React.FC<MappingUtilityProps> = ({
  onMappingChange,
  onMappingDataChange,
  onCurrentMappingsChange,
  onConfigUpdate,
  sourceSchema,
  configId,
  existingMappings = []
}) => {
  // State for managing mappings
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [currentMappings, setCurrentMappings] = useState<FieldMapping[]>(existingMappings);
  
  // State for dynamic destination tree from API
  const [destinationTree, setDestinationTree] = useState<TreeNode[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  // Load existing mappings on component mount
  useEffect(() => {
    console.log('🔄 MappingUtility - existingMappings changed:', existingMappings);
    console.log('🔄 MappingUtility - existingMappings length:', existingMappings.length);
    console.log('🔄 MappingUtility - About to set currentMappings to existingMappings');
    setCurrentMappings(existingMappings);
    validateMappings(existingMappings);
    console.log('🔄 MappingUtility - currentMappings set to existingMappings');
  }, [existingMappings]);

  // Fetch current mappings from backend on component mount if configId is available
  useEffect(() => {
    console.log('🔄 MappingUtility - configId changed:', configId);
    if (configId) {
      console.log('🔄 MappingUtility - configId is available, fetching mappings...');
      fetchCurrentMappings();
    } else {
      console.log('🔄 MappingUtility - configId not available yet, skipping fetch');
    }
  }, [configId]);

  // Expose current mappings to parent component whenever they change
  useEffect(() => {
    console.log('📤 MappingUtility - Sending current mappings to parent:', currentMappings);
    console.log('📤 MappingUtility - Current mappings length:', currentMappings.length);
    if (onCurrentMappingsChange) {
      onCurrentMappingsChange(currentMappings);
    }
  }, [currentMappings]); // Removed onCurrentMappingsChange from deps to prevent infinite loop

  // Function to fetch current config and refresh mappings
  const fetchCurrentMappings = async () => {
    if (!configId) {
      console.warn('🔄 MappingUtility - No configId provided, cannot fetch mappings');
      return;
    }

    try {
      console.log('🔄 MappingUtility - Fetching current config and mappings for configId:', configId);
      const response = await configApi.getConfig(configId);
      
      if (response.success && response.config) {
        const mappings = response.config.mapping || [];
        console.log('✅ MappingUtility - Fetched mappings from backend:', mappings);
        console.log('✅ MappingUtility - Mappings count:', mappings.length);
        console.log('✅ MappingUtility - About to call setCurrentMappings with:', mappings);
        setCurrentMappings(mappings);
        validateMappings(mappings);
        console.log('✅ MappingUtility - setCurrentMappings and validateMappings called successfully');
      } else {
        console.error('❌ MappingUtility - Failed to fetch config:', response.message);
      }
    } catch (error) {
      console.error('❌ MappingUtility - Error fetching config:', error);
    }
  };

  // Function to fetch destination options (can be reused)
  const fetchDestinationOptions = async () => {
    try {
      setLoadingDestinations(true);
      setDestinationError(null);
      
      const response = await dataModelApi.getDestinationOptions();
      // Backend returns {success: true, options: [...]}
      if (response.success && response.options) {
        const treeNodes = convertDestinationOptionsToTree(response.options);
        setDestinationTree(treeNodes);
      } else {
        throw new Error(response.message || 'Failed to fetch destination options');
      }
    } catch (error) {
      console.error('Error fetching destination options:', error);
      setDestinationError('Failed to load destination fields. Please try again.');
      // Fallback to empty array on error
      setDestinationTree([]);
    } finally {
      setLoadingDestinations(false);
    }
  };

  // Load destination options from API on mount
  useEffect(() => {
    fetchDestinationOptions();
  }, []);

  // Function to save mapping to backend
  const saveMapping = async (mapping: MappingField): Promise<boolean> => {
    if (!configId) {
      setMappingError('No configuration ID provided');
      return false;
    }

    setSavingMapping(true);
    setMappingError(null);

    try {
      const mappingRequest: AddMappingRequest = {
        // Handle different transformation types
        source: mapping.transformFunction === 'split' ? mapping.source[0] : 
                mapping.transformFunction === 'concatenate' ? undefined : mapping.source[0],
        destination: mapping.transformFunction === 'split' ? undefined : mapping.destination[0],
        sources: mapping.transformFunction === 'concatenate' ? mapping.source : undefined,
        destinations: mapping.transformFunction === 'split' ? mapping.destination : undefined,
        delimiter: mapping.transformFunction === 'split' ? delimiter : undefined,
        separator: mapping.transformFunction === 'concatenate' ? delimiter : undefined,
      };

      console.log('Saving mapping to backend:', mappingRequest);
      const response = await configApi.addMapping(configId, mappingRequest);
      
      console.log('✅ Backend response from addMapping:', response);
      console.log('✅ Response success:', response.success);
      console.log('✅ Response config:', response.config);
      console.log('✅ Response config mapping:', response.config?.mapping);
      
      if (response.success && response.config) {
        console.log('✅ Mapping saved successfully, backend returned config with mappings');
        
        // IMMEDIATE UPDATE: Use the mappings from the response immediately
        const newMappings = response.config.mapping || [];
        console.log('✅ Setting mappings from response:', newMappings.length, 'mappings');
        console.log('✅ New mappings content:', newMappings);
        setCurrentMappings(newMappings);
        console.log('✅ setCurrentMappings called with:', newMappings);
        console.log('✅ After setCurrentMappings, currentMappings should be:', newMappings);
        validateMappings(newMappings);
        
        console.log('✅ Mappings updated immediately from API response');
        
        // Update parent component with mapping data
        if (onMappingDataChange && response.config) {
          const config = response.config;
          onMappingDataChange({
            sourceFields: config.schema?.properties ? 
              Object.keys(config.schema.properties).map(key => ({
                path: key,
                type: config.schema.properties?.[key]?.type || 'string',
                isRequired: Array.isArray(config.schema?.required) && config.schema.required.includes(key) || false,
              })) : [],
            destinationFields: (config.mapping || []).flatMap((m: FieldMapping) => {
              const destinations = Array.isArray(m.destination) ? m.destination : [m.destination || ''];
              return destinations.map(dest => ({
                path: dest,
                type: 'string',
                isRequired: false,
              }));
            }),
            transformation: 'NONE',
            constants: {},
          });
        }

        // Update parent config
        if (onConfigUpdate && response.config) {
          onConfigUpdate(response.config);
        }
        
        console.log('Mapping saved successfully');
        return true;
      } else {
        setMappingError(response.message || 'Failed to save mapping');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMappingError(`Failed to save mapping: ${errorMessage}`);
      console.error('Error saving mapping:', error);
      return false;
    } finally {
      setSavingMapping(false);
    }
  };

  // Function to remove mapping from backend
  const removeMappingFromBackend = async (index: number) => {
    if (!configId) {
      setMappingError('No configuration ID provided');
      return false;
    }

    setSavingMapping(true);
    setMappingError(null);

    try {
      const response = await configApi.removeMapping(configId, index);
      
      if (response.success && response.config) {
        const newMappings = response.config.mapping || [];
        setCurrentMappings(newMappings);
        validateMappings(newMappings);
        
        console.log('Mapping removed successfully');
        return true;
      } else {
        setMappingError(response.message || 'Failed to remove mapping');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMappingError(`Failed to remove mapping: ${errorMessage}`);
      console.error('Error removing mapping:', error);
      return false;
    } finally {
      setSavingMapping(false);
    }
  };

  // Convert JSON schema to hierarchical tree structure
  const buildSourceTreeFromSchema = (schema: any, parentPath: string[] = []): TreeNode[] => {
    if (!schema) return [];
    
    const nodes: TreeNode[] = [];
    
    // Handle JSON schema properties
    if (schema.properties && typeof schema.properties === 'object') {
      Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
        const path = parentPath.length > 0 ? [...parentPath, key] : [key];
        const id = path.join('.');
        
        const node: TreeNode = {
          id,
          name: key,
          path,
          type: value.type || 'string'
        };
        
        // If the property has nested properties, create children
        if (value.properties) {
          node.children = buildSourceTreeFromSchema(value, path);
        } else if (value.items && value.items.properties) {
          // Handle array items with properties
          node.children = buildSourceTreeFromSchema(value.items, path);
        }
        
        nodes.push(node);
      });
    }
    
    return nodes;
  };

  // Convert array format to tree structure (fallback for different schema formats)
  const buildSourceTreeFromArray = (schemaArray: any[]): TreeNode[] => {
    if (!schemaArray || !Array.isArray(schemaArray)) return [];
    
    // Build a tree structure from flat array of schema fields
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];
    
    // First pass: create all nodes
    schemaArray.forEach((field) => {
      const pathParts = field.path ? field.path.split('.') : [field.name || 'unknown'];
      const node: TreeNode = {
        id: field.path || field.name || 'unknown',
        name: field.name || pathParts[pathParts.length - 1] || 'unknown',
        path: pathParts,
        type: field.type?.toLowerCase() || 'string',
        children: []
      };
      nodeMap.set(node.id, node);
    });
    
    // Second pass: build parent-child relationships
    nodeMap.forEach((node, nodeId) => {
      const pathParts = nodeId.split('.');
      if (pathParts.length === 1) {
        // Top-level node
        rootNodes.push(node);
      } else {
        // Child node - find parent
        const parentPath = pathParts.slice(0, -1).join('.');
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          if (!parentNode.children) {
            parentNode.children = [];
          }
          parentNode.children.push(node);
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      }
    });
    
    return rootNodes;
  };

  // Generate source tree from the provided schema
  const sourceTree: TreeNode[] = (() => {
    console.log('MappingUtility sourceSchema:', sourceSchema);
    console.log('MappingUtility sourceSchema type:', typeof sourceSchema);
    console.log('MappingUtility configId:', configId);
    
    if (!sourceSchema) {
      console.log('No sourceSchema provided');
      return [{
        id: 'payload',
        name: 'Generated Fields',
        path: ['payload'],
        children: [{
          id: 'payload.noFields',
          name: 'No fields generated yet - Click "Generate Fields" first',
          path: ['payload', 'noFields'],
          type: 'info'
        }]
      }];
    }
    
    // If sourceSchema is an array (from our interface)
    if (Array.isArray(sourceSchema)) {
      console.log('Processing array sourceSchema:', sourceSchema);
      return buildSourceTreeFromArray(sourceSchema);
    }
    
    // If sourceSchema is a JSON schema object
    if (sourceSchema.properties || sourceSchema.type === 'object') {
      console.log('Processing JSON schema object:', sourceSchema);
      return buildSourceTreeFromSchema(sourceSchema);
    }
    
    // Fallback
    console.log('Using fallback schema processing for:', sourceSchema);
    return [{
      id: 'schema',
      name: 'Schema Data',
      path: ['schema'],
      children: Object.keys(sourceSchema).map(key => ({
        id: `schema.${key}`,
        name: key,
        path: ['schema', key],
        type: typeof sourceSchema[key] === 'string' ? 'string' : 'object'
      }))
    }];
  })();
  // Helper function to convert API destination options to TreeNode format
  const convertDestinationOptionsToTree = (options: DestinationOption[]): TreeNode[] => {
    // Group options by collection to create a hierarchical structure
    const collections = new Map<string, DestinationOption[]>();
    
    options.forEach(option => {
      const existing = collections.get(option.collection) || [];
      existing.push(option);
      collections.set(option.collection, existing);
    });

    return Array.from(collections.entries()).map(([collectionName, fields]) => ({
      id: collectionName,
      name: collectionName.charAt(0).toUpperCase() + collectionName.slice(1),
      path: [collectionName],
      children: fields.map(field => ({
        id: field.value,
        name: field.field,
        path: [collectionName, field.field],
        type: field.type.toLowerCase() as 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
      }))
    }));
  };
  // Valkey cache sample data
  const valkeyTree: TreeNode[] = [{
    id: 'valkey',
    name: 'Valkey Cache',
    path: ['valkey'],
    children: [{
      id: 'valkey.accountDetails',
      name: 'accountDetails',
      path: ['valkey', 'accountDetails'],
      type: 'object'
    }, {
      id: 'valkey.preferences',
      name: 'preferences',
      path: ['valkey', 'preferences'],
      type: 'object'
    }, {
      id: 'valkey.limits',
      name: 'limits',
      path: ['valkey', 'limits'],
      type: 'object'
    }, {
      id: 'valkey.lastTransaction',
      name: 'lastTransaction',
      path: ['valkey', 'lastTransaction'],
      type: 'object'
    }]
  }];
  const [expandedSourceNodes, setExpandedSourceNodes] = useState<string[]>([]);
  const [expandedDestNodes, setExpandedDestNodes] = useState<string[]>([]);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedDestinationType, setSelectedDestinationType] = useState<'database' | 'valkey' | 'model'>('database');
  const [selectedTransformation, setSelectedTransformation] = useState<'concatenate' | 'sum' | 'split' | 'none'>('none');
  const [delimiter, setDelimiter] = useState<string>(' ');
  
  // Helper function to check if current selection is valid for the transformation type
  const isCurrentMappingValid = () => {
    if (selectedTransformation === 'concatenate') {
      return selectedSources.length >= 2 && selectedDestinations.length === 1;
    } else if (selectedTransformation === 'split') {
      return selectedSources.length === 1 && selectedDestinations.length >= 2;
    } else if (selectedTransformation === 'none') {
      return selectedSources.length === 1 && selectedDestinations.length === 1;
    }
    return selectedSources.length > 0 && selectedDestinations.length > 0;
  };
  
  const validateMappings = (newMappings: FieldMapping[]) => {
    const isValid = newMappings.every(mapping => mapping.source || mapping.sources);
    onMappingChange(isValid);
  };
  const addNewMapping = () => {
    setSelectedSources([]);
    setSelectedDestinations([]);
    setSelectedDestinationType('database');
    setSelectedTransformation('none');
    setDelimiter(' '); // Reset delimiter to default
    setMappingError(null); // Clear any previous errors
    setShowAddMapping(true);
  };

  const toggleSourceNode = (nodeId: string) => {
    if (expandedSourceNodes.includes(nodeId)) {
      setExpandedSourceNodes(expandedSourceNodes.filter(id => id !== nodeId));
    } else {
      setExpandedSourceNodes([...expandedSourceNodes, nodeId]);
    }
  };
  const toggleDestNode = (nodeId: string) => {
    if (expandedDestNodes.includes(nodeId)) {
      setExpandedDestNodes(expandedDestNodes.filter(id => id !== nodeId));
    } else {
      setExpandedDestNodes([...expandedDestNodes, nodeId]);
    }
  };
  const handleSourceSelect = (path: string[]) => {
    // Toggle selection
    const pathStr = path.join('.');
    console.log('Source field selected:', pathStr);
    if (selectedSources.includes(pathStr)) {
      setSelectedSources(selectedSources.filter(p => p !== pathStr));
    } else {
      setSelectedSources([...selectedSources, pathStr]);
    }
  };
  const handleDestinationSelect = (path: string[], type: 'database' | 'valkey' | 'model') => {
    // Toggle selection for destinations
    const pathStr = path.join('.');
    console.log('Destination field selected:', pathStr, 'Type:', type);
    if (selectedDestinations.includes(pathStr)) {
      setSelectedDestinations(selectedDestinations.filter(p => p !== pathStr));
    } else {
      setSelectedDestinations([...selectedDestinations, pathStr]);
    }
    setSelectedDestinationType(type);
  };
  const handleSaveMapping = async () => {
    // Validate based on transformation type
    let validationError = '';
    
    if (selectedTransformation === 'concatenate') {
      if (selectedSources.length < 2) {
        validationError = 'Concatenate requires at least 2 source fields';
      } else if (selectedDestinations.length !== 1) {
        validationError = 'Concatenate requires exactly 1 destination field';
      }
    } else if (selectedTransformation === 'split') {
      if (selectedSources.length !== 1) {
        validationError = 'Split requires exactly 1 source field';
      } else if (selectedDestinations.length < 2) {
        validationError = 'Split requires at least 2 destination fields';
      }
    } else if (selectedTransformation === 'none') {
      if (selectedSources.length !== 1) {
        validationError = 'Direct mapping requires exactly 1 source field';
      } else if (selectedDestinations.length !== 1) {
        validationError = 'Direct mapping requires exactly 1 destination field';
      }
    } else {
      if (selectedSources.length === 0 || selectedDestinations.length === 0) {
        validationError = 'Please select at least one source and one destination field';
      }
    }

    if (validationError) {
      setMappingError(validationError);
      return;
    }

    const newMapping: MappingField = {
      source: selectedSources,
      destination: selectedDestinations,
      destinationType: selectedDestinationType,
      transformFunction: selectedTransformation
    };
    
    // Save to backend API
    const success = await saveMapping(newMapping);
    if (success) {
      // Close modal only if backend save was successful
      // currentMappings is updated automatically in saveMapping function
      setShowAddMapping(false);
      console.log('Mapping saved successfully to backend');
    } else {
      console.error('Failed to save mapping to backend');
      // Show error to user but don't close modal
    }
  };

  const renderTree = (nodes: TreeNode[], expanded: string[], toggleFn: (id: string) => void, onSelect: (path: string[], type?: any) => void, selectedPaths: string[] = [], type: 'source' | 'destination' | 'valkey' = 'source') => {
    return <div className="space-y-1" data-id="element-176">
        {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded.includes(node.id);
        const isSelected = selectedPaths.includes(node.path.join('.'));
        return <div key={node.id} className="ml-2" data-id="element-177">
              <div className={`flex items-center p-1 rounded hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`} data-id="element-178">
                {hasChildren ? <button onClick={() => toggleFn(node.id)} className="p-1 text-gray-500 hover:text-gray-700" data-id="element-179">
                    <ChevronRightIcon size={16} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} data-id="element-180" />
                  </button> : <span className="w-6" data-id="element-181"></span>}
                {type === 'source' && <FolderIcon size={16} className="mr-2 text-blue-500" data-id="element-182" />}
                {type === 'destination' && <DatabaseIcon size={16} className="mr-2 text-green-500" data-id="element-183" />}
                {type === 'valkey' && <ServerIcon size={16} className="mr-2 text-purple-500" data-id="element-184" />}
                <button onClick={() => onSelect(node.path, type === 'valkey' ? 'valkey' : 'database')} className="text-left flex-1 text-sm" data-id="element-185">
                  {node.name}
                  {node.type && <span className="ml-2 text-xs text-gray-500" data-id="element-186">
                      ({node.type})
                    </span>}
                </button>
              </div>
              {hasChildren && isExpanded && <div className="ml-4 pl-2 border-l border-gray-200" data-id="element-187">
                  {renderTree(node.children ?? [], expanded, toggleFn, onSelect, selectedPaths, type)}
                </div>}
            </div>;
      })}
      </div>;
  };
  const renderAddMappingModal = () => {
    if (!showAddMapping) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center" data-id="element-188">
        {/* Enhanced blurred backdrop */}
        <div className="absolute inset-0 backdrop-blur-sm backdrop-saturate-150" onClick={() => setShowAddMapping(false)}></div>
        <div className="bg-white rounded-lg w-full max-w-6xl p-6 max-h-[90vh] overflow-auto relative z-10 shadow-2xl" data-id="element-189">
          <div className="flex justify-between items-center mb-6" data-id="element-190">
            <h3 className="text-lg font-medium text-gray-900" data-id="element-191">
              Add New Mapping
            </h3>
            <button onClick={() => setShowAddMapping(false)} className="text-gray-500 hover:text-gray-700" data-id="element-192">
              <XIcon size={20} data-id="element-193" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6" data-id="element-194">
            {/* Source Selection */}
            <div className="space-y-4" data-id="element-195">
              <h4 className="font-medium text-gray-700" data-id="element-196">Source Fields</h4>
              <div className="border border-gray-200 rounded-md p-3 h-96 overflow-auto" data-id="element-197">
                <div className="mb-2 text-sm text-gray-500" data-id="element-198">
                  Message Structure
                </div>
                {renderTree(sourceTree, expandedSourceNodes, toggleSourceNode, handleSourceSelect, selectedSources, 'source')}
              </div>
              <div className="text-sm text-gray-600" data-id="element-199">
                Selected: {selectedSources.join(', ') || 'None'}
              </div>
            </div>
            {/* Transformation */}
            <div className="space-y-4" data-id="element-200">
              <h4 className="font-medium text-gray-700" data-id="element-201">Transformation</h4>
              <div className="border border-gray-200 rounded-md p-3 h-96 overflow-auto flex flex-col" data-id="element-202">
                <div className="mb-4" data-id="element-203">
                  <label className="block text-sm font-medium text-gray-700 mb-2" data-id="element-204">
                    Select Transformation Function
                  </label>
                  <select value={selectedTransformation} onChange={e => setSelectedTransformation(e.target.value as 'concatenate' | 'sum' | 'split' | 'none')} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-205">
                    <option value="none" data-id="element-206">None (Direct Mapping)</option>
                    <option value="concatenate" data-id="element-207">Concatenate</option>
                    <option value="sum" data-id="element-208">Sum</option>
                    <option value="split" data-id="element-209">Split</option>
                  </select>
                </div>
                {(selectedTransformation === 'split' || selectedTransformation === 'concatenate') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedTransformation === 'split' ? 'Split Delimiter' : 'Separator'}
                    </label>
                    <input 
                      type="text" 
                      value={delimiter} 
                      onChange={e => setDelimiter(e.target.value)}
                      placeholder={selectedTransformation === 'split' ? ' ' : ' '}
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedTransformation === 'split' 
                        ? 'Character(s) to split by (e.g., space " " or comma ",")'
                        : 'Character(s) to join with (e.g., space " " or comma ",")'
                      }
                    </p>
                  </div>
                )}
                <div className="flex-1 flex items-center justify-center" data-id="element-210">
                  {selectedTransformation === 'concatenate' && <div className="text-center p-4 bg-gray-50 rounded-md" data-id="element-211">
                      <h5 className="font-medium text-gray-700 mb-2" data-id="element-212">
                        Concatenate
                      </h5>
                      <p className="text-sm text-gray-600" data-id="element-213">
                        Combines multiple source fields into a single string.
                        <br data-id="element-214" />
                        <br data-id="element-215" />
                        Example: "John" + " " + "Doe" → "John Doe"
                      </p>
                    </div>}
                  {selectedTransformation === 'sum' && <div className="text-center p-4 bg-gray-50 rounded-md" data-id="element-216">
                      <h5 className="font-medium text-gray-700 mb-2" data-id="element-217">Sum</h5>
                      <p className="text-sm text-gray-600" data-id="element-218">
                        Adds numeric values from multiple source fields.
                        <br data-id="element-219" />
                        <br data-id="element-220" />
                        Example: 10 + 20 + 30 → 60
                      </p>
                    </div>}
                  {selectedTransformation === 'split' && <div className="text-center p-4 bg-gray-50 rounded-md" data-id="element-221">
                      <h5 className="font-medium text-gray-700 mb-2" data-id="element-222">Split</h5>
                      <p className="text-sm text-gray-600" data-id="element-223">
                        Divides a single source field into multiple destination
                        fields.
                        <br data-id="element-224" />
                        <br data-id="element-225" />
                        Example: "John Doe" → "John" and "Doe"
                      </p>
                    </div>}
                  {selectedTransformation === 'none' && <div className="text-center p-4 bg-gray-50 rounded-md" data-id="element-226">
                      <h5 className="font-medium text-gray-700 mb-2" data-id="element-227">
                        Direct Mapping
                      </h5>
                      <p className="text-sm text-gray-600" data-id="element-228">
                        Maps source fields directly to destination fields
                        without transformation.
                      </p>
                    </div>}
                </div>
              </div>
            </div>
            {/* Destination Selection */}
            <div className="space-y-4" data-id="element-229">
              <h4 className="font-medium text-gray-700" data-id="element-230">Destination</h4>
              <div className="border border-gray-200 rounded-md p-3 h-96 overflow-auto" data-id="element-231">
                <div className="mb-2 text-sm text-gray-500" data-id="element-232">Tazama Data Model</div>
                {loadingDestinations ? (
                  <div className="text-sm text-gray-500 py-4">Loading destination fields...</div>
                ) : destinationError ? (
                  <div className="text-sm text-red-500 py-4">{destinationError}</div>
                ) : (
                  renderTree(destinationTree, expandedDestNodes, toggleDestNode, (path, type) => handleDestinationSelect(path, type as 'database' | 'valkey' | 'model'), selectedDestinations, 'destination')
                )}
                <div className="mt-4 mb-2 text-sm text-gray-500" data-id="element-233">
                  Valkey Cache (Update)
                </div>
                {renderTree(valkeyTree, expandedDestNodes, toggleDestNode, path => handleDestinationSelect(path, 'valkey'), selectedDestinations, 'valkey')}
              </div>
              <div className="text-sm text-gray-600" data-id="element-234">
                Selected: {selectedDestinations.join(', ') || 'None'}
              </div>
            </div>
          </div>
          {/* Error Display */}
          {mappingError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
              <div className="text-red-800 text-sm">{mappingError}</div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 mt-6" data-id="element-235">
            <Button variant="secondary" onClick={() => setShowAddMapping(false)} data-id="element-236">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSaveMapping} 
              disabled={!isCurrentMappingValid() || savingMapping} 
              data-id="element-237"
            >
              {savingMapping ? 'Saving...' : 'Add Mapping'}
            </Button>
          </div>
        </div>
      </div>;
  };

  return <div className="space-y-6" data-id="element-271">
      {/* Error Display */}
      {mappingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800 text-sm">{mappingError}</div>
        </div>
      )}
        <div className="flex justify-between items-center mb-4" data-id="element-272">
        <h3 className="text-lg font-medium text-gray-900" data-id="element-273">Field Mapping</h3>
        <Button variant="secondary" size="sm" onClick={addNewMapping} icon={<PlusIcon size={16} data-id="element-279" />} data-id="element-278">
          Add Mapping
        </Button>
      </div>
      {/* Current Mappings Display */}
      {(() => {
        console.log('🎨 MappingUtility RENDER - currentMappings:', currentMappings);
        console.log('🎨 MappingUtility RENDER - currentMappings.length:', currentMappings.length);
        return null;
      })()}
      {currentMappings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">Current Mappings ({currentMappings.length})</h4>
          <div className="space-y-2">
            {(() => {
              console.log('🎨 RENDERING Current Mappings section, currentMappings:', currentMappings);
              return null;
            })()}
            {currentMappings.map((mapping, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {mapping.sources ? mapping.sources.join(' + ') : 
                     Array.isArray(mapping.source) ? mapping.source.join(' + ') : mapping.source} 
                    <ArrowRightIcon size={16} className="inline mx-2" />
                    {Array.isArray(mapping.destination) ? mapping.destination.join(' + ') : mapping.destination}
                  </span>
                  {mapping.separator && (
                    <span className="text-xs text-gray-500">({mapping.separator})</span>
                  )}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => removeMappingFromBackend(index)}
                  disabled={savingMapping}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
    
      
      {currentMappings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No mappings created yet.</p>
          <p className="text-xs mt-1">Click "Add Mapping" to get started.</p>
        </div>
      ) : null}
      
     
      {/* Add Mapping Modal */}
      {renderAddMappingModal()}
    </div>;
};