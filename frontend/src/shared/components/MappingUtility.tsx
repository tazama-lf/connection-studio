import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightIcon,
  PlusIcon,
  XIcon,
  ChevronRightIcon,
  FolderIcon,
  DatabaseIcon,
  ServerIcon,
  Shuffle,
  FileText,
} from 'lucide-react';
import { Button } from './Button';
import {
  configApi,
  type FieldMapping,
} from '../../features/config/services/configApi';
import {
  dataModelApi,
  type DestinationOption,
} from '../../features/data-model';
import { Backdrop } from '@mui/material';

interface MappingUtilityProps {
  onMappingChange: (isValid: boolean) => void;
  onMappingDataChange?: (mappingData: MappingData) => void;
  onCurrentMappingsChange?: (mappings: FieldMapping[]) => void;
  sourceSchema?:
    | Array<{
        name: string;
        path: string;
        type: string;
        isRequired: boolean;
      }>
    | any; // Accept both array format and JSON schema object
  templateType?: string;
  configId?: number; // ID of the configuration to add mappings to
  existingMappings?: FieldMapping[]; // Existing mappings from backend
  readOnly?: boolean; // When true, disable all editing functionality
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
  sourceSchema,
  configId,
  existingMappings = [],
  readOnly = false,
}) => {
  // State for managing mappings
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [currentMappings, setCurrentMappings] =
    useState<FieldMapping[]>(existingMappings);

  // State for dynamic destination tree from API
  const [destinationTree, setDestinationTree] = useState<TreeNode[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  // Load existing mappings on component mount
  useEffect(() => {
    console.log(
      '🔄 MappingUtility - existingMappings changed:',
      existingMappings,
    );
    console.log(
      '🔄 MappingUtility - existingMappings length:',
      existingMappings.length,
    );
    console.log(
      '🔄 MappingUtility - About to set currentMappings to existingMappings',
    );
    setCurrentMappings(existingMappings);
    validateMappings(existingMappings);
    console.log('🔄 MappingUtility - currentMappings set to existingMappings');
  }, [existingMappings]);

  // Fetch current mappings from backend on component mount if configId is available
  useEffect(() => {
    console.log('🔄 MappingUtility - configId changed:', configId);
    if (configId) {
      console.log(
        '🔄 MappingUtility - configId is available, fetching mappings...',
      );
      fetchCurrentMappings();
    } else {
      console.log(
        '🔄 MappingUtility - configId not available yet, skipping fetch',
      );
    }
  }, [configId]);

  // Expose current mappings to parent component whenever they change
  useEffect(() => {
    console.log(
      '📤 MappingUtility - Sending current mappings to parent:',
      currentMappings,
    );
    console.log(
      '📤 MappingUtility - Current mappings length:',
      currentMappings.length,
    );
    if (onCurrentMappingsChange) {
      onCurrentMappingsChange(currentMappings);
    }
  }, [currentMappings]); // Removed onCurrentMappingsChange from deps to prevent infinite loop

  // Function to fetch current config and refresh mappings
  const fetchCurrentMappings = async () => {
    if (!configId) {
      console.warn(
        '🔄 MappingUtility - No configId provided, cannot fetch mappings',
      );
      return;
    }

    try {
      console.log(
        '🔄 MappingUtility - Fetching current config and mappings for configId:',
        configId,
      );
      const response = await configApi.getConfig(configId);

      if (response.success && response.config) {
        const mappings = response.config.mapping || [];
        console.log(
          '✅ MappingUtility - Fetched mappings from backend:',
          mappings,
        );
        console.log('✅ MappingUtility - Mappings count:', mappings.length);
        console.log(
          '✅ MappingUtility - About to call setCurrentMappings with:',
          mappings,
        );
        setCurrentMappings(mappings);
        validateMappings(mappings);
        console.log(
          '✅ MappingUtility - setCurrentMappings and validateMappings called successfully',
        );
      } else {
        console.error(
          '❌ MappingUtility - Failed to fetch config:',
          response.message,
        );
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
      // Backend returns {success: true, data: [...]}
      if (response.success && response.data) {
        const treeNodes = convertDestinationOptionsToTree(response.data);
        setDestinationTree(treeNodes);
      } else {
        throw new Error(
          response.message || 'Failed to fetch destination options',
        );
      }
    } catch (error) {
      console.error('Error fetching destination options:', error);
      setDestinationError(
        'Failed to load destination fields. Please try again.',
      );
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

  // Function to remove mapping from backend
  const removeMappingFromBackend = async (index: number) => {
    try {
      console.log('🗑️ Removing mapping from backend:', index);
      const response = await configApi.removeMapping(configId!, index);

      if (response.success) {
        console.log('✅ Mapping removed successfully from backend');

        // Update local state only after successful API call
        const updatedMappings = currentMappings.filter((_, i) => i !== index);
        setCurrentMappings(updatedMappings);
        validateMappings(updatedMappings);

        // Notify parent component
        if (onCurrentMappingsChange) {
          onCurrentMappingsChange(updatedMappings);
        }

        console.log('Mapping removed successfully');
      } else {
        console.error('❌ Failed to remove mapping:', response.message);
        setMappingError(`Failed to remove mapping: ${response.message}`);
      }
    } catch (error) {
      console.error('❌ Error removing mapping:', error);
      setMappingError('Failed to remove mapping. Please try again.');
    }
  };

  // Convert JSON schema to hierarchical tree structure
  const buildSourceTreeFromSchema = (
    schema: any,
    parentPath: string[] = [],
  ): TreeNode[] => {
    if (!schema) return [];

    const nodes: TreeNode[] = [];

    // Handle JSON schema properties
    if (schema.properties && typeof schema.properties === 'object') {
      Object.entries(schema.properties).forEach(
        ([key, value]: [string, any]) => {
          const path = parentPath.length > 0 ? [...parentPath, key] : [key];
          const id = path.join('.');

          const node: TreeNode = {
            id,
            name: key,
            path,
            type: value.type || 'string',
          };

          // If the property has nested properties, create children
          if (value.properties) {
            node.children = buildSourceTreeFromSchema(value, path);
          } else if (value.items && value.items.properties) {
            // Handle array items with properties
            node.children = buildSourceTreeFromSchema(value.items, path);
          }

          nodes.push(node);
        },
      );
    }

    return nodes;
  };

  // Convert array format to tree structure (fallback for different schema formats)
  const buildSourceTreeFromArray = (schemaArray: any[]): TreeNode[] => {
    if (!schemaArray || !Array.isArray(schemaArray)) return [];

    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    console.log('🏗️ Building source tree from', schemaArray.length, 'fields');

    // First pass: create all nodes AND their parent nodes
    schemaArray.forEach((field) => {
      const originalPath = field.path || field.name || 'unknown';

      // Remove [0] notation to get clean path, but remember which paths are arrays
      const cleanPath = originalPath.replace(/\[0\]/g, '');
      const pathParts = cleanPath.split('.').filter((p: string) => p); // Remove empty parts

      console.log(
        '🔍 Processing field:',
        originalPath,
        '-> Clean path:',
        cleanPath,
        '-> Parts:',
        pathParts,
      );

      // Track which parts of the path represent arrays
      const arrayPaths = new Set<string>();
      let tempPath = '';
      originalPath.split('.').forEach((part: string) => {
        if (part.includes('[0]')) {
          const cleanPart = part.replace('[0]', '');
          tempPath = tempPath ? `${tempPath}.${cleanPart}` : cleanPart;
          arrayPaths.add(tempPath);
        } else {
          tempPath = tempPath ? `${tempPath}.${part}` : part;
        }
      });

      console.log('📋 Array paths detected:', Array.from(arrayPaths));

      // Create all parent nodes in the path if they don't exist
      let currentPath = '';
      pathParts.forEach((part: string, index: number) => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;

        // Skip if this node already exists
        if (nodeMap.has(currentPath)) return;

        const isArrayContainer = arrayPaths.has(currentPath);
        const nodeName = part;
        const isLastPart = index === pathParts.length - 1;
        const fieldType = isArrayContainer
          ? 'array'
          : isLastPart
            ? field.type?.toLowerCase() || 'object'
            : 'object';

        const node: TreeNode = {
          id: currentPath,
          name: nodeName,
          path: [currentPath],
          type: fieldType,
          children: [],
        };

        nodeMap.set(currentPath, node);
        console.log(
          '📝 Created node:',
          currentPath,
          'Type:',
          fieldType,
          'Name:',
          nodeName,
          'Is Array?',
          isArrayContainer,
        );
      });
    });

    // Add hardcoded TenantId field at root level if not already present
    if (!nodeMap.has('TenantId')) {
      const tenantIdNode: TreeNode = {
        id: 'TenantId',
        name: 'TenantId',
        path: ['TenantId'],
        type: 'string',
        children: [],
      };
      nodeMap.set('TenantId', tenantIdNode);
      console.log('📌 Added hardcoded TenantId field to source tree');
    } else {
      console.log(
        '📌 TenantId already exists at root level, skipping hardcoded addition',
      );
    }

    // Second pass: build parent-child relationships
    console.log('📊 All nodes in map:', Array.from(nodeMap.keys()));

    nodeMap.forEach((node, nodeId) => {
      let parentPath = '';

      // Find parent by removing the last segment
      const lastDotIndex = nodeId.lastIndexOf('.');
      if (lastDotIndex > 0) {
        parentPath = nodeId.substring(0, lastDotIndex);
      }

      console.log(
        '🔗 Node:',
        nodeId,
        '-> Looking for parent:',
        parentPath || '(root)',
        'Exists?',
        nodeMap.has(parentPath),
      );

      if (parentPath && nodeMap.has(parentPath)) {
        const parentNode = nodeMap.get(parentPath)!;
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
        console.log(
          '  ✅ Added to parent. Parent now has',
          parentNode.children.length,
          'children',
        );
      } else {
        // Root node - only add if not already in rootNodes
        const alreadyInRoot = rootNodes.some((n) => n.id === nodeId);
        if (!alreadyInRoot) {
          rootNodes.push(node);
          console.log('  📍 Added to root');
        } else {
          console.log('  ⏭️ Already in root, skipping');
        }
      }
    });

    console.log(
      '🌳 Tree built. Root nodes:',
      rootNodes.map((n) => n.id).join(', '),
    );

    // Log nodes with children
    nodeMap.forEach((node, nodeId) => {
      if (node.children && node.children.length > 0) {
        console.log(
          '👨‍👧‍👦 Node with children:',
          nodeId,
          'has',
          node.children.length,
          'children:',
          node.children.map((c) => c.name).join(', '),
        );
      }
    });

    return rootNodes;
  }; // Generate source tree from the provided schema (memoized to prevent recalculation)
  const sourceTree: TreeNode[] = useMemo(() => {
    console.log('🔄 Recalculating sourceTree');
    console.log('MappingUtility sourceSchema:', sourceSchema);
    console.log('MappingUtility sourceSchema type:', typeof sourceSchema);
    console.log('MappingUtility configId:', configId);

    if (!sourceSchema) {
      console.log('No sourceSchema provided');
      return [
        {
          id: 'payload',
          name: 'Generated Fields',
          path: ['payload'],
          children: [
            {
              id: 'payload.noFields',
              name: 'No fields generated yet - Click "Generate Fields" first',
              path: ['payload', 'noFields'],
              type: 'info',
            },
          ],
        },
      ];
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
    return [
      {
        id: 'schema',
        name: 'Schema Data',
        path: ['schema'],
        children: Object.keys(sourceSchema).map((key) => ({
          id: `schema.${key}`,
          name: key,
          path: ['schema', key],
          type: typeof sourceSchema[key] === 'string' ? 'string' : 'object',
        })),
      },
    ];
  }, [sourceSchema]); // Only recalculate when sourceSchema changes
  // Helper function to convert API destination options to TreeNode format
  const convertDestinationOptionsToTree = (
    options: DestinationOption[],
  ): TreeNode[] => {
    // Group options by collection to create a hierarchical structure
    const collections = new Map<string, DestinationOption[]>();

    options.forEach((option) => {
      const existing = collections.get(option.collection) || [];
      existing.push(option);
      collections.set(option.collection, existing);
    });

    // Sort collections so redis appears at the end
    const sortedCollections = Array.from(collections.entries()).sort(
      ([a], [b]) => {
        if (a === 'redis') return 1; // redis goes to the end
        if (b === 'redis') return -1; // redis goes to the end
        return a.localeCompare(b); // alphabetical for others
      },
    );

    // Helper function to build nested tree structure from dot-separated paths
    const buildNestedTree = (
      collectionName: string,
      fields: DestinationOption[],
    ): TreeNode[] => {
      // Create a tree structure where each node can have children
      const rootMap = new Map<
        string,
        { node: TreeNode; children: Map<string, any> }
      >();

      fields.forEach((field) => {
        // Split field path into parts (e.g., "intrBkSttlmAmt.amt" -> ["intrBkSttlmAmt", "amt"])
        const parts = field.field.split('.');

        // Always build hierarchy for all fields
        let currentLevel = rootMap;
        let currentPath: string[] = [collectionName];

        parts.forEach((part, index) => {
          const isLeaf = index === parts.length - 1;
          currentPath = [...currentPath, part];
          const pathKey = parts.slice(0, index + 1).join('.');
          const fullPath = `${collectionName}.${pathKey}`;

          if (!currentLevel.has(part)) {
            // Create new node
            currentLevel.set(part, {
              node: {
                id: isLeaf ? field.value : fullPath,
                name: part,
                path: [...currentPath],
                type: isLeaf
                  ? (field.type.toLowerCase() as
                      | 'string'
                      | 'number'
                      | 'boolean'
                      | 'date'
                      | 'object'
                      | 'array')
                  : 'object',
              },
              children: new Map(),
            });
          } else if (isLeaf) {
            // Update existing node if this is the leaf (actual field definition)
            const existing = currentLevel.get(part)!;
            existing.node.id = field.value;
            existing.node.type = field.type.toLowerCase() as
              | 'string'
              | 'number'
              | 'boolean'
              | 'date'
              | 'object'
              | 'array';
          }

          // Move to next level
          const entry = currentLevel.get(part)!;
          currentLevel = entry.children;
        });
      });

      // Convert map structure to TreeNode array with children
      const convertMapToNodes = (map: Map<string, any>): TreeNode[] => {
        return Array.from(map.values()).map(({ node, children }) => {
          if (children.size > 0) {
            return {
              ...node,
              children: convertMapToNodes(children),
            };
          }
          return node;
        });
      };

      return convertMapToNodes(rootMap);
    };

    return sortedCollections.map(([collectionName, fields]) => ({
      id: collectionName,
      name: collectionName.charAt(0).toUpperCase() + collectionName.slice(1),
      path: [collectionName],
      children: buildNestedTree(collectionName, fields),
    }));
  };
  const [expandedSourceNodes, setExpandedSourceNodes] = useState<string[]>([]);
  const [expandedDestNodes, setExpandedDestNodes] = useState<string[]>([]);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(
    [],
  );
  const [selectedTransformation, setSelectedTransformation] = useState<
    'concatenate' | 'sum' | 'split' | 'none' | 'constant'
  >('none');
  const [delimiter, setDelimiter] = useState<string>('');
  const [prefix, setPrefix] = useState<string>('');

  // Helper function to check if current selection is valid for the transformation type
  const isCurrentMappingValid = () => {
    const getFieldType = (fieldPath: string): string | undefined => {
      if (Array.isArray(sourceSchema)) {
        const field = sourceSchema.find((f) => {
          const cleanPath = (f.path || f.name || '').replace(
            /\[(\d+)\]/g,
            '.$1',
          );
          return cleanPath === fieldPath || f.path === fieldPath;
        });
        return field?.type?.toLowerCase();
      }
      return undefined;
    };

    const getDestinationType = (fieldPath: string): string | undefined => {
      const parts = fieldPath.split('.');
      if (parts.length === 0) return undefined;

      const findType = (
        nodes: TreeNode[],
        pathParts: string[],
        depth: number = 0,
      ): string | undefined => {
        if (pathParts.length === 0) return undefined;

        const [first, ...rest] = pathParts;
        const node = nodes.find(
          (n) => n.name.toLowerCase() === first.toLowerCase(),
        );

        if (!node) return undefined;
        if (rest.length === 0) {
          return node.type;
        }
        if (node.children) return findType(node.children, rest, depth + 1);

        return undefined;
      };

      const result = findType(destinationTree, parts);
      return result;
    };

    const areTypesCompatible = (
      sourceType: string | undefined,
      destType: string | undefined,
    ): boolean => {
      if (!sourceType || !destType) return true;

      const normalizeType = (type: string) => {
        if (
          type === 'integer' ||
          type === 'number' ||
          type === 'double' ||
          type === 'float'
        )
          return 'number';
        if (type === 'text' || type === 'varchar') return 'string';
        return type;
      };

      const normSource = normalizeType(sourceType);
      const normDest = normalizeType(destType);

      return normSource === normDest;
    };

    if (selectedTransformation === 'concatenate') {
      if (selectedSources.length < 2 || selectedDestinations.length !== 1) {
        return false;
      }
      const allStrings = selectedSources.every((src) => {
        const type = getFieldType(src);
        return !type || type === 'string' || type === 'text';
      });

      const destType = getDestinationType(selectedDestinations[0]);
      const destIsString =
        !destType || destType === 'string' || destType === 'text';

      return allStrings && destIsString;
    } else if (selectedTransformation === 'sum') {
      if (selectedSources.length < 2 || selectedDestinations.length !== 1) {
        return false;
      }
      const allNumbers = selectedSources.every((src) => {
        const type = getFieldType(src);
        return (
          !type ||
          type === 'number' ||
          type === 'integer' ||
          type === 'double' ||
          type === 'float'
        );
      });

      const destType = getDestinationType(selectedDestinations[0]);
      const destIsNumber =
        !destType ||
        destType === 'number' ||
        destType === 'integer' ||
        destType === 'double' ||
        destType === 'float';

      return allNumbers && destIsNumber;
    } else if (selectedTransformation === 'split') {
      if (selectedSources.length !== 1 || selectedDestinations.length < 2) {
        return false;
      }
      const sourceType = getFieldType(selectedSources[0]);
      const sourceIsString =
        !sourceType || sourceType === 'string' || sourceType === 'text';

      const allDestsString = selectedDestinations.every((dest) => {
        const type = getDestinationType(dest);
        return !type || type === 'string' || type === 'text';
      });

      return sourceIsString && allDestsString;
    } else if (selectedTransformation === 'none') {
      if (selectedSources.length !== 1 || selectedDestinations.length !== 1) {
        return false;
      }
      // Check type compatibility for direct mapping
      const sourceType = getFieldType(selectedSources[0]);
      const destType = getDestinationType(selectedDestinations[0]);

      return areTypesCompatible(sourceType, destType);
    } else if (selectedTransformation === 'constant') {
      return selectedDestinations.length === 1;
    }
    return selectedSources.length > 0 && selectedDestinations.length > 0;
  };

  const validateMappings = (newMappings: FieldMapping[]) => {
    const isValid = newMappings.every(
      (mapping) =>
        mapping.source ||
        mapping.sources ||
        mapping.constantValue !== undefined,
    );
    onMappingChange(isValid);
  };
  const addNewMapping = () => {
    setSelectedSources([]);
    setSelectedDestinations([]);
    setSelectedTransformation('none');
    setDelimiter(''); // Reset delimiter to empty
    setPrefix(''); // Reset prefix to default
    setMappingError(null); // Clear any previous errors
    setShowAddMapping(true);
  };

  const toggleSourceNode = (nodeId: string) => {
    if (expandedSourceNodes.includes(nodeId)) {
      setExpandedSourceNodes(expandedSourceNodes.filter((id) => id !== nodeId));
    } else {
      setExpandedSourceNodes([...expandedSourceNodes, nodeId]);
    }
  };
  const toggleDestNode = (nodeId: string) => {
    if (expandedDestNodes.includes(nodeId)) {
      setExpandedDestNodes(expandedDestNodes.filter((id) => id !== nodeId));
    } else {
      setExpandedDestNodes([...expandedDestNodes, nodeId]);
    }
  };
  const handleSourceSelect = (path: string[]) => {
    // Path is stored as clean path without [0], but we need to check if we need to add it back
    // For fields that are inside arrays, we need to reconstruct the original path with [0]
    const pathStr = path[0] || path.join('.');

    console.log('🎯 Source field selected - RAW path array:', path);
    console.log('🎯 Source field selected - FINAL pathStr:', pathStr);

    // Check if this path needs [0] notation by looking at the original schema
    let finalPath = pathStr;
    if (Array.isArray(sourceSchema)) {
      const matchingField = sourceSchema.find((f) => {
        const cleanFieldPath = (f.path || f.name || '').replace(/\[0\]/g, '');
        return cleanFieldPath === pathStr;
      });

      if (
        matchingField &&
        matchingField.path &&
        matchingField.path.includes('[0]')
      ) {
        // Use the original path with [0] notation
        finalPath = matchingField.path.replace(/\[0\]/g, '.0');
        console.log('🎯 Found original path with [0]:', finalPath);
      }
    }

    console.log('🎯 Final path to use:', finalPath.replace(/\[0\]/g, '.0'));
    console.log('🎯 Contains [0] notation?', finalPath.includes('[0]'));

    if (selectedSources.includes(finalPath)) {
      setSelectedSources(selectedSources.filter((p) => p !== finalPath));
    } else {
      setSelectedSources([...selectedSources, finalPath]);
    }
  };
  const handleDestinationSelect = (
    path: string[],
    type: 'database' | 'redis' | 'model',
  ) => {
    // Toggle selection for destinations
    const pathStr = path.join('.');
    console.log('Destination field selected:', pathStr, 'Type:', type);
    if (selectedDestinations.includes(pathStr)) {
      setSelectedDestinations(
        selectedDestinations.filter((p) => p !== pathStr),
      );
    } else {
      setSelectedDestinations([...selectedDestinations, pathStr]);
    }
  };
  const handleSaveMapping = async () => {
    // Check if any selected destination is already used in existing mappings
    const usedDestinations = new Set<string>();
    currentMappings.forEach((mapping) => {
      // Collect all destinations from existing mappings
      if (mapping.destination) {
        if (Array.isArray(mapping.destination)) {
          mapping.destination.forEach((dest) => {
            if (dest) usedDestinations.add(dest);
          });
        } else {
          usedDestinations.add(mapping.destination);
        }
      }
      if (mapping.destinations && Array.isArray(mapping.destinations)) {
        mapping.destinations.forEach((dest) => {
          if (dest) usedDestinations.add(dest);
        });
      }
    });

    // Check if any of the selected destinations are already used
    const alreadyUsedDestinations = selectedDestinations.filter((dest) =>
      usedDestinations.has(dest),
    );
    if (alreadyUsedDestinations.length > 0) {
      setMappingError(
        `The following destination are already mapped: (${alreadyUsedDestinations.join(', ')})`,
      );
      return;
    }

    // Check for duplicate mappings first
    const isDuplicate = currentMappings.some((existingMapping) => {
      // For constant mappings, check constant value and destination
      if (selectedTransformation === 'constant') {
        return (
          existingMapping.transformation === 'CONSTANT' &&
          existingMapping.constantValue === selectedSources[0] &&
          existingMapping.destination === selectedDestinations[0]
        );
      }

      // For other mappings, check source, destination, and transformation
      const existingSource = Array.isArray(existingMapping.source)
        ? existingMapping.source.filter(
            (s): s is string => s != null && s !== '',
          ) // Filter out null/undefined/empty
        : [existingMapping.source].filter(
            (s): s is string => s != null && s !== '',
          );
      const existingDestination = Array.isArray(existingMapping.destination)
        ? existingMapping.destination.filter(
            (d): d is string => d != null && d !== '',
          ) // Filter out null/undefined/empty
        : [existingMapping.destination].filter(
            (d): d is string => d != null && d !== '',
          );

      const currentSource = selectedSources.filter((s) => s);
      const currentDestination = selectedDestinations.filter((d) => d);

      // Check if sources match (order doesn't matter for comparison)
      const sourcesMatch =
        existingSource.length === currentSource.length &&
        existingSource.every((src) => currentSource.includes(src)) &&
        currentSource.every((src) => existingSource.includes(src));

      // Check if destinations match
      const destinationsMatch =
        existingDestination.length === currentDestination.length &&
        existingDestination.every((dest) =>
          currentDestination.includes(dest),
        ) &&
        currentDestination.every((dest) => existingDestination.includes(dest));

      // Check transformation type
      const transformationMatch =
        existingMapping.transformation === selectedTransformation.toUpperCase();

      return sourcesMatch && destinationsMatch && transformationMatch;
    });

    if (isDuplicate) {
      setMappingError(
        'This mapping already exists. Please create a different mapping.',
      );
      return;
    }

    // Validate based on transformation type
    let validationError = '';

    if (selectedTransformation === 'concatenate') {
      if (selectedSources.length < 2) {
        validationError = 'Concatenate requires at least 2 source fields';
      } else if (selectedDestinations.length !== 1) {
        validationError = 'Concatenate requires exactly 1 destination field';
      }
    } else if (selectedTransformation === 'sum') {
      if (selectedSources.length < 2) {
        validationError = 'Sum requires at least 2 source fields';
      } else if (selectedDestinations.length !== 1) {
        validationError = 'Sum requires exactly 1 destination field';
      }
    } else if (selectedTransformation === 'split') {
      if (selectedSources.length !== 1) {
        validationError = 'Split requires exactly 1 source field';
      } else if (selectedDestinations.length < 2) {
        validationError = 'Split requires at least 2 destination fields';
      }
    } else if (selectedTransformation === 'constant') {
      if (selectedSources.length !== 1) {
        validationError = 'Constant mapping requires exactly 1 constant value';
      } else if (selectedDestinations.length !== 1) {
        validationError =
          'Constant mapping requires exactly 1 destination field';
      }
    } else if (selectedTransformation === 'none') {
      if (selectedSources.length !== 1) {
        validationError = 'Direct mapping requires exactly 1 source field';
      } else if (selectedDestinations.length !== 1) {
        validationError = 'Direct mapping requires exactly 1 destination field';
      }
    } else {
      if (selectedSources.length === 0 || selectedDestinations.length === 0) {
        validationError =
          'Please select at least one source and one destination field';
      }
    }

    if (validationError) {
      setMappingError(validationError);
      return;
    }

    // Create AddMappingRequest object for API
    const mappingRequest = {
      source:
        selectedTransformation === 'split'
          ? selectedSources[0]
          : selectedTransformation === 'concatenate'
            ? undefined
            : selectedTransformation === 'sum'
              ? undefined
              : selectedTransformation === 'constant'
                ? undefined
                : selectedSources[0],
      destination:
        selectedTransformation === 'split'
          ? undefined
          : selectedDestinations[0],
      sources:
        selectedTransformation === 'concatenate' ? selectedSources : undefined,
      sumFields: selectedTransformation === 'sum' ? selectedSources : undefined,
      destinations:
        selectedTransformation === 'split' ? selectedDestinations : undefined,
      delimiter:
        selectedTransformation === 'split' ? delimiter || ' ' : undefined,
      separator:
        selectedTransformation === 'concatenate' ? delimiter || ' ' : undefined,
      constantValue:
        selectedTransformation === 'constant' ? selectedSources[0] : undefined,
      prefix: prefix.trim() || undefined,
    };

    // Call API to save mapping directly
    try {
      console.log('💾 Saving mapping to backend:', mappingRequest);
      console.log('💾 Selected sources array:', selectedSources);
      console.log('💾 Source to be saved:', mappingRequest.source);
      console.log('💾 Contains [0]?', mappingRequest.source?.includes('[0]'));
      const response = await configApi.addMapping(configId!, mappingRequest);

      if (response.success) {
        console.log('✅ Mapping saved successfully to backend');

        // Create FieldMapping object for local state (includes transformation info)
        const newFieldMapping: FieldMapping = {
          source:
            selectedTransformation === 'split'
              ? selectedSources[0]
              : selectedTransformation === 'concatenate'
                ? undefined
                : selectedTransformation === 'sum'
                  ? undefined
                  : selectedTransformation === 'constant'
                    ? undefined
                    : selectedSources[0],
          destination:
            selectedTransformation === 'split'
              ? undefined
              : selectedDestinations[0],
          sources:
            selectedTransformation === 'concatenate' ||
            selectedTransformation === 'sum'
              ? selectedSources
              : undefined,
          destinations:
            selectedTransformation === 'split'
              ? selectedDestinations
              : undefined,
          delimiter:
            selectedTransformation === 'split' ? delimiter || ' ' : undefined,
          separator:
            selectedTransformation === 'concatenate'
              ? delimiter || ' '
              : undefined,
          constantValue:
            selectedTransformation === 'constant'
              ? selectedSources[0]
              : undefined,
          transformation: selectedTransformation.toUpperCase(),
          operator: selectedTransformation === 'sum' ? 'SUM' : undefined,
          prefix: prefix.trim() || undefined,
        };

        // Update local state only after successful API call
        const updatedMappings = [...currentMappings, newFieldMapping];
        setCurrentMappings(updatedMappings);
        validateMappings(updatedMappings);

        // Notify parent component
        if (onCurrentMappingsChange) {
          onCurrentMappingsChange(updatedMappings);
        }

        // Close modal
        setShowAddMapping(false);
        console.log('Mapping added successfully');
      } else {
        console.error('❌ Failed to save mapping:', response.message);
        setMappingError(`Failed to save mapping: ${response.message}`);
      }
    } catch (error) {
      console.error('❌ Error saving mapping:', error);
      setMappingError('Failed to save mapping. Please try again.');
    }
  };

  const renderTree = (
    nodes: TreeNode[],
    expanded: string[],
    toggleFn: (id: string) => void,
    onSelect: (
      path: string[],
      type?: any,
      expanded?: string[],
      selectedPaths?: string[],
    ) => void,
    selectedPaths: string[] = [],
    type: 'source' | 'destination' | 'redis' = 'source',
    depth: number = 0,
  ) => {
    return (
      <div className="space-y-1" data-id="element-176">
        {nodes.map((node, index) => {
          console.log('TREE', nodes, expanded, selectedPaths, type, depth);

          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expanded.includes(node.id);
          const isSelected = selectedPaths
            .map((path) => path.replace(/\.0\./g, '.'))
            .includes(node.path.join('.'));

          // Determine the actual type for this node - redis nodes should be purple
          const nodeType = node.id.startsWith('redis') ? 'redis' : type;
          const isRedis = node.id === 'redis';
          const isTenantId = node.id === 'TenantId' && depth === 0;

          return (
            <div key={node.id} data-id="element-177">
              {/* Add "System Reserved" heading before TenantId */}
              {isTenantId && (
                <div className="mb-2 mt-4">
                  <div className="text-sm text-gray-600">System Reserved</div>
                </div>
              )}
              {/* Add spacing and heading before redis section */}
              {isRedis && index > 0 && (
                <div className="mt-4 mb-2">
                  <div className="text-sm text-gray-500">Data Cache</div>
                </div>
              )}
              <div
                className={`flex items-center p-1 rounded hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
                style={{ paddingLeft: `${depth * 20 + 4}px` }}
                data-id="element-178"
              >
                {hasChildren ? (
                  <button
                    onClick={() => toggleFn(node.id)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    data-id="element-179"
                  >
                    <ChevronRightIcon
                      size={16}
                      className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      data-id="element-180"
                    />
                  </button>
                ) : (
                  <span className="w-6" data-id="element-181"></span>
                )}
                {/* {nodeType === 'source' && <FolderIcon size={16} className="mr-2 text-blue-500" data-id="element-182" />}
            {nodeType === 'destination' && <DatabaseIcon size={16} className="mr-2 text-green-500" data-id="element-183" />}
            {nodeType === 'redis' && <ServerIcon size={16} className="mr-2 text-purple-500" data-id="element-184" />} */}
                {/* Only allow selection for leaf nodes (no children, not object/array) */}
                {!hasChildren &&
                node.type !== 'object' &&
                node.type !== 'array' ? (
                  <button
                    onClick={() =>
                      onSelect(
                        node.path,
                        nodeType === 'redis' ? 'redis' : 'database',
                        expanded,
                        selectedPaths,
                      )
                    }
                    className="text-left flex-1 text-sm hover:text-blue-700"
                    data-id="element-185"
                  >
                    {node.name}
                    {node.type && (
                      <span
                        className="ml-2 text-xs text-gray-500"
                        data-id="element-186"
                      >
                        ({node.type})
                      </span>
                    )}
                  </button>
                ) : (
                  <span
                    className="text-left flex-1 text-sm cursor-not-allowed select-none"
                    title="Select a field, not an object or array"
                    data-id="element-185"
                  >
                    {node.name}
                    {node.type && (
                      <span
                        className="ml-2 text-xs text-gray-500"
                        data-id="element-186"
                      >
                        ({node.type})
                      </span>
                    )}
                  </span>
                )}
              </div>
              {hasChildren &&
                isExpanded &&
                renderTree(
                  node.children ?? [],
                  expanded,
                  toggleFn,
                  onSelect,
                  selectedPaths,
                  nodeType,
                  depth + 1,
                )}
            </div>
          );
        })}
      </div>
    );
  };
  const renderAddMappingModal = () => {
    if (!showAddMapping) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        data-id="element-188"
      >
        {/* Enhanced blurred backdrop */}
        {/* <div className="absolute inset-0 backdrop-blur-sm backdrop-saturate-150" onClick={() => setShowAddMapping(false)}></div> */}
        <Backdrop
          sx={(theme) => ({
            zIndex: theme.zIndex.drawer + 1,
            overflow: 'hidden',
          })}
          open={true}
        >
          <div
            className="bg-white rounded-lg w-full max-w-6xl p-6 max-h-[90vh] overflow-auto relative z-10 "
            data-id="element-189"
          >
            <div
              className="flex justify-between items-center mb-6"
              data-id="element-190"
            >
              <h3
                className="text-lg font-medium text-gray-900"
                data-id="element-191"
              >
                Add New Mapping
              </h3>
              <button
                onClick={() => setShowAddMapping(false)}
                className="text-gray-500 hover:text-gray-700"
                data-id="element-192"
              >
                <XIcon size={20} data-id="element-193" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6" data-id="element-194">
              {/* Source Selection */}
              {selectedTransformation !== 'constant' && (
                <div className="space-y-4" data-id="element-195">
                  <h4
                    className="font-medium text-gray-700 flex items-center gap-2"
                    data-id="element-196"
                  >
                    <FileText size={18} style={{ color: '#2b7fff' }} />
                    Source Fields
                  </h4>
                  <div
                    className="border border-gray-200 rounded-md p-3 h-96 overflow-auto"
                    data-id="element-197"
                  >
                    <div
                      className="mb-2 text-sm text-gray-500"
                      data-id="element-198"
                    >
                      Message Structure
                    </div>
                    {renderTree(
                      sourceTree,
                      expandedSourceNodes,
                      toggleSourceNode,
                      handleSourceSelect,
                      selectedSources,
                      'source',
                    )}
                  </div>
                  <div className="text-sm text-gray-600" data-id="element-199">
                    <span className="font-bold">Selected:</span>{' '}
                    {selectedSources.join(', ') || 'None'}
                  </div>
                </div>
              )}

              {/* Constant Value Input */}
              {selectedTransformation === 'constant' && (
                <div className="space-y-4" data-id="element-constant-1">
                  <h4
                    className="font-medium text-gray-700"
                    data-id="element-constant-2"
                  >
                    Constant Value
                  </h4>
                  <div
                    className="border border-gray-200 rounded-md p-3"
                    data-id="element-constant-3"
                  >
                    <label
                      className="block text-sm font-medium text-gray-700 mb-2"
                      data-id="element-constant-4"
                    >
                      Enter Constant Value:
                    </label>
                    <input
                      type="text"
                      value={selectedSources[0] || ''}
                      onChange={(e) => setSelectedSources([e.target.value])}
                      placeholder="Enter a constant value (string, number, etc.)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div
                      className="mt-2 text-sm text-gray-500"
                      data-id="element-constant-5"
                    >
                      This value will be mapped directly to the destination
                      field
                    </div>
                  </div>
                </div>
              )}

              {/* Transformation */}
              <div className="space-y-4" data-id="element-200">
                <h4
                  className="font-medium text-gray-700 flex items-center gap-2"
                  data-id="element-201"
                >
                  <Shuffle size={18} style={{ color: '#2b7fff' }} />
                  Transformation
                </h4>
                <div
                  className="border border-gray-200 rounded-md p-3 h-96 overflow-auto flex flex-col"
                  data-id="element-202"
                >
                  <div className="mb-4" data-id="element-203">
                    <label
                      className="block text-sm font-medium text-gray-700 mb-2"
                      data-id="element-204"
                    >
                      Select Transformation Function
                    </label>
                    <select
                      value={selectedTransformation}
                      onChange={(e) =>
                        setSelectedTransformation(
                          e.target.value as
                            | 'concatenate'
                            | 'sum'
                            | 'split'
                            | 'none'
                            | 'constant',
                        )
                      }
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      data-id="element-205"
                    >
                      <option value="none" data-id="element-206">
                        None (Direct Mapping)
                      </option>
                      <option value="concatenate" data-id="element-207">
                        Concatenate
                      </option>
                      <option value="split" data-id="element-209">
                        Split
                      </option>
                      <option
                        value="constant"
                        data-id="element-constant-option"
                      >
                        Constant Value
                      </option>
                    </select>
                  </div>
                  {(selectedTransformation === 'split' ||
                    selectedTransformation === 'concatenate') && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {selectedTransformation === 'split'
                          ? 'Split Delimiter'
                          : 'Separator'}
                      </label>
                      <input
                        type="text"
                        value={delimiter}
                        onChange={(e) =>
                          setDelimiter(e.target.value.slice(0, 1))
                        }
                        placeholder=""
                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedTransformation === 'split'
                          ? 'Split using character (default: space)'
                          : 'Join using character (default: space)'}
                      </p>
                    </div>
                  )}
                  <div
                    className="flex-1 flex items-end justify-center"
                    data-id="element-210"
                  >
                    {selectedTransformation === 'concatenate' && (
                      <div
                        className="text-center p-4 bg-gray-50 rounded-md"
                        data-id="element-211"
                      >
                        <h5
                          className="font-medium text-gray-700 mb-2"
                          data-id="element-212"
                        >
                          Concatenate
                        </h5>
                        <p
                          className="text-sm text-gray-600"
                          data-id="element-213"
                        >
                          Combines multiple source fields into a single string.
                          <br data-id="element-214" />
                          <br data-id="element-215" />
                          Example: "John" + " " + "Doe" → "John Doe"
                        </p>
                      </div>
                    )}
                    {selectedTransformation === 'split' && (
                      <div
                        className="text-center p-4 bg-gray-50 rounded-md"
                        data-id="element-221"
                      >
                        <h5
                          className="font-medium text-gray-700 mb-2"
                          data-id="element-222"
                        >
                          Split
                        </h5>
                        <p
                          className="text-sm text-gray-600"
                          data-id="element-223"
                        >
                          Divides a single source field into multiple
                          destination fields.
                          <br data-id="element-224" />
                          <br data-id="element-225" />
                          Example: "John Doe" → "John" and "Doe"
                        </p>
                      </div>
                    )}
                    {selectedTransformation === 'none' && (
                      <div
                        className="text-center p-4 bg-gray-50 rounded-md"
                        data-id="element-226"
                      >
                        <h5
                          className="font-medium text-gray-700 mb-2"
                          data-id="element-227"
                        >
                          Direct Mapping
                        </h5>
                        <p
                          className="text-sm text-gray-600"
                          data-id="element-228"
                        >
                          Maps source fields directly to destination fields
                          without transformation.
                        </p>
                      </div>
                    )}
                    {selectedTransformation === 'constant' && (
                      <div
                        className="text-center p-4 bg-gray-50 rounded-md"
                        data-id="element-229"
                      >
                        <h5
                          className="font-medium text-gray-700 mb-2"
                          data-id="element-230"
                        >
                          Constant Value
                        </h5>
                        <p
                          className="text-sm text-gray-600"
                          data-id="element-231"
                        >
                          Maps a fixed constant value to the destination field,
                          ignoring any source data.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Destination Selection */}
              <div className="space-y-4" data-id="element-229">
                <h4
                  className="font-medium text-gray-700 flex items-center gap-2"
                  data-id="element-230"
                >
                  <DatabaseIcon size={18} style={{ color: '#2b7fff' }} />
                  Destination
                </h4>
                <div
                  className="border border-gray-200 rounded-md p-3 h-96 overflow-auto"
                  data-id="element-231"
                >
                  <div
                    className="mb-2 text-sm text-gray-500"
                    data-id="element-232"
                  >
                    Data Model
                  </div>
                  {loadingDestinations ? (
                    <div className="text-sm text-gray-500 py-4">
                      Loading destination fields...
                    </div>
                  ) : destinationError ? (
                    <div className="text-sm text-red-500 py-4">
                      {destinationError}
                    </div>
                  ) : (
                    renderTree(
                      destinationTree,
                      expandedDestNodes,
                      toggleDestNode,
                      (path, type) =>
                        handleDestinationSelect(
                          path,
                          type as 'database' | 'redis' | 'model',
                        ),
                      selectedDestinations,
                      'destination',
                    )
                  )}
                </div>
                <div className="text-sm text-gray-600" data-id="element-234">
                  <span className="font-bold">Selected:</span>{' '}
                  {selectedDestinations.join(', ') || 'None'}
                </div>
              </div>
            </div>
            {/* Error Display */}
            {mappingError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4 relative">
                <button
                  onClick={() => setMappingError(null)}
                  className="cursor-pointer absolute top-1/2 -translate-y-1/2 right-2 text-red-600 hover:text-red-800"
                >
                  <XIcon size={16} />
                </button>
                <div className="text-red-800 text-sm pr-6">{mappingError}</div>
              </div>
            )}

            <div
              className="flex justify-end space-x-3 mt-6"
              data-id="element-235"
            >
              <Button
                variant="secondary"
                className="!pb-[6px] !pt-[4px]"
                onClick={() => setShowAddMapping(false)}
                data-id="element-236"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="!pb-[6px] !pt-[4px]"
                onClick={handleSaveMapping}
                disabled={!isCurrentMappingValid()}
                data-id="element-237"
              >
                Add Mapping
              </Button>
            </div>
          </div>
        </Backdrop>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-id="element-271">
      {/* Error Display */}

      <div className="flex justify-end items-center mb-4" data-id="element-272">
        {/* <h3 className="text-lg font-medium text-gray-900" data-id="element-273">Field Mapping</h3> */}
        <Button
          variant="secondary"
          size="sm"
          onClick={addNewMapping}
          icon={<PlusIcon size={16} data-id="element-279" />}
          disabled={readOnly}
          data-id="element-278"
        >
          Add Mapping
        </Button>
      </div>
      {/* Current Mappings Display */}
      {(() => {
        console.log(
          '🎨 MappingUtility RENDER - currentMappings:',
          currentMappings,
        );
        console.log(
          '🎨 MappingUtility RENDER - currentMappings.length:',
          currentMappings.length,
        );
        return null;
      })()}
      {currentMappings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            Current Mappings ({currentMappings.length})
          </h4>
          <div className="space-y-2">
            {(() => {
              console.log(
                '🎨 RENDERING Current Mappings section, currentMappings:',
                currentMappings,
              );
              return null;
            })()}
            {currentMappings.map((mapping, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white p-2 rounded border"
              >
                <div className="flex items-center space-x-2">
                  {mapping.transformation && (
                    <span className="text-xs text-blue-600 font-medium">
                      [
                      {mapping.transformation === 'NONE'
                        ? 'DIRECT'
                        : mapping.transformation}
                      ]
                    </span>
                  )}
                  <span className="text-sm text-gray-600">
                    {mapping.transformation === 'CONSTANT'
                      ? `"${mapping.constantValue}"`
                      : mapping.sources
                        ? mapping.sources.join(' + ')
                        : Array.isArray(mapping.source)
                          ? mapping.source.join(' + ')
                          : mapping.source}
                    {!mapping.transformation &&
                      mapping?.constantValue &&
                      `"${mapping.constantValue}"`}
                    <ArrowRightIcon size={16} className="inline mx-2" />
                    {mapping.prefix ? `"${mapping.prefix}" + ` : ''}
                    {/* Fixed: Show destinations for SPLIT transformation */}
                    {mapping.destinations
                      ? mapping.destinations.join(' + ')
                      : Array.isArray(mapping.destination)
                        ? mapping.destination.join(' + ')
                        : mapping.destination}
                  </span>
                  {mapping.separator && (
                    <span className="text-xs text-gray-500">
                      (separator: "{mapping.separator}")
                    </span>
                  )}
                  {mapping.delimiter && (
                    <span className="text-xs text-gray-500">
                      (separator: "{mapping.delimiter}")
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => removeMappingFromBackend(index)}
                  disabled={readOnly}
                  className="text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentMappings.length === 0 ? (
        <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center">
          <svg
            className="w-10 h-10 mb-3 text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5m6 0v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2m6-2v2m0-2a2 2 0 012 2v2m0-2a2 2 0 00-2-2v2m0-2a2 2 0 012 2v2"
            />
          </svg>
          <p
            className="text-base font-semibold mb-1 "
            style={{ color: '#3b3b3b' }}
          >
            No mappings yet
          </p>
          <p className="text-sm text-gray-500 mb-1">
            You haven't created any field mappings for this configuration.
          </p>
          {!readOnly && (
            <p className="text-xs mt-1 text-gray-500">
              Click <span className="font-semibold">"Add Mapping"</span> to get
              started.
            </p>
          )}
        </div>
      ) : null}

      {/* Add Mapping Modal */}
      {renderAddMappingModal()}
    </div>
  );
};
