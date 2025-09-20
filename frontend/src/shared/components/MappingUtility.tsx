import React, { useState } from 'react';
import { ArrowRightIcon, PlusIcon, XIcon, ChevronRightIcon, FolderIcon, DatabaseIcon, LayersIcon, ServerIcon } from 'lucide-react';
import { Button } from './Button';
interface MappingField {
  source: string[];
  destination: string[];
  destinationType: 'database' | 'valkey' | 'model';
  transformFunction: 'concatenate' | 'sum' | 'split' | 'none';
}
interface DataModelExtension {
  collection: string;
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required: boolean;
  defaultValue?: string;
}
interface MappingUtilityProps {
  onMappingChange: (isValid: boolean) => void;
  templateType?: string;
}
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  type?: string;
  path: string[];
}
export const MappingUtility: React.FC<MappingUtilityProps> = ({
  onMappingChange
}) => {
  // Sample hierarchical source data structure
  const sourceTree: TreeNode[] = [{
    id: 'transaction',
    name: 'transaction',
    path: ['transaction'],
    children: [{
      id: 'transaction.id',
      name: 'id',
      path: ['transaction', 'id'],
      type: 'string'
    }, {
      id: 'transaction.amount',
      name: 'amount',
      path: ['transaction', 'amount'],
      type: 'number'
    }, {
      id: 'transaction.currency',
      name: 'currency',
      path: ['transaction', 'currency'],
      type: 'string'
    }, {
      id: 'transaction.status',
      name: 'status',
      path: ['transaction', 'status'],
      type: 'string'
    }, {
      id: 'transaction.details',
      name: 'details',
      path: ['transaction', 'details'],
      children: [{
        id: 'transaction.details.type',
        name: 'type',
        path: ['transaction', 'details', 'type'],
        type: 'string'
      }, {
        id: 'transaction.details.description',
        name: 'description',
        path: ['transaction', 'details', 'description'],
        type: 'string'
      }]
    }]
  }, {
    id: 'customer',
    name: 'customer',
    path: ['customer'],
    children: [{
      id: 'customer.id',
      name: 'id',
      path: ['customer', 'id'],
      type: 'string'
    }, {
      id: 'customer.name',
      name: 'name',
      path: ['customer', 'name'],
      type: 'string'
    }, {
      id: 'customer.email',
      name: 'email',
      path: ['customer', 'email'],
      type: 'string'
    }, {
      id: 'customer.address',
      name: 'address',
      path: ['customer', 'address'],
      children: [{
        id: 'customer.address.street',
        name: 'street',
        path: ['customer', 'address', 'street'],
        type: 'string'
      }, {
        id: 'customer.address.city',
        name: 'city',
        path: ['customer', 'address', 'city'],
        type: 'string'
      }, {
        id: 'customer.address.country',
        name: 'country',
        path: ['customer', 'address', 'country'],
        type: 'string'
      }]
    }]
  }];
  // Sample destination data model
  const destinationTree: TreeNode[] = [{
    id: 'accounts',
    name: 'accounts',
    path: ['accounts'],
    children: [{
      id: 'accounts.id',
      name: 'id',
      path: ['accounts', 'id'],
      type: 'string'
    }, {
      id: 'accounts.fullName',
      name: 'fullName',
      path: ['accounts', 'fullName'],
      type: 'string'
    }, {
      id: 'accounts.email',
      name: 'email',
      path: ['accounts', 'email'],
      type: 'string'
    }, {
      id: 'accounts.balance',
      name: 'balance',
      path: ['accounts', 'balance'],
      type: 'number'
    }, {
      id: 'accounts.status',
      name: 'status',
      path: ['accounts', 'status'],
      type: 'string'
    }]
  }, {
    id: 'transactions',
    name: 'transactions',
    path: ['transactions'],
    children: [{
      id: 'transactions.id',
      name: 'id',
      path: ['transactions', 'id'],
      type: 'string'
    }, {
      id: 'transactions.accountId',
      name: 'accountId',
      path: ['transactions', 'accountId'],
      type: 'string'
    }, {
      id: 'transactions.amount',
      name: 'amount',
      path: ['transactions', 'amount'],
      type: 'number'
    }, {
      id: 'transactions.currency',
      name: 'currency',
      path: ['transactions', 'currency'],
      type: 'string'
    }, {
      id: 'transactions.type',
      name: 'type',
      path: ['transactions', 'type'],
      type: 'string'
    }, {
      id: 'transactions.timestamp',
      name: 'timestamp',
      path: ['transactions', 'timestamp'],
      type: 'date'
    }]
  }];
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
  const [mappings, setMappings] = useState<MappingField[]>([{
    source: ['customer.name'],
    destination: ['accounts.fullName'],
    destinationType: 'database',
    transformFunction: 'none'
  }, {
    source: ['transaction.amount', 'transaction.currency'],
    destination: ['transactions.amount', 'transactions.currency'],
    destinationType: 'database',
    transformFunction: 'none'
  }, {
    source: ['transaction.id'],
    destination: ['valkey.lastTransaction'],
    destinationType: 'valkey',
    transformFunction: 'none'
  }]);
  const [dataModelExtensions, setDataModelExtensions] = useState<DataModelExtension[]>([{
    collection: 'accounts',
    field: 'verificationStatus',
    type: 'string',
    required: false,
    defaultValue: 'PENDING'
  }]);
  const [expandedSourceNodes, setExpandedSourceNodes] = useState<string[]>(['transaction', 'customer']);
  const [expandedDestNodes, setExpandedDestNodes] = useState<string[]>(['accounts', 'transactions']);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [showAddExtension, setShowAddExtension] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedDestinationType, setSelectedDestinationType] = useState<'database' | 'valkey' | 'model'>('database');
  const [activeTab, setActiveTab] = useState<'mapping' | 'extensions'>('mapping');
  const [selectedTransformation, setSelectedTransformation] = useState<'concatenate' | 'sum' | 'split' | 'none'>('none');
  const validateMappings = (newMappings: MappingField[]) => {
    const isValid = newMappings.every(mapping => mapping.source.length > 0 && mapping.destination.length > 0);
    onMappingChange(isValid);
  };
  const addNewMapping = () => {
    setSelectedSources([]);
    setSelectedDestinations([]);
    setSelectedDestinationType('database');
    setSelectedTransformation('none');
    setShowAddMapping(true);
  };
  const addNewExtension = () => {
    setShowAddExtension(true);
  };
  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
    validateMappings(newMappings);
  };
  const removeExtension = (index: number) => {
    const newExtensions = dataModelExtensions.filter((_, i) => i !== index);
    setDataModelExtensions(newExtensions);
  };
  const updateMapping = (index: number, field: 'source' | 'destination' | 'destinationType' | 'transformFunction', value: any) => {
    const newMappings = [...mappings];
    if (field === 'transformFunction') {
      newMappings[index][field] = value as 'concatenate' | 'sum' | 'split' | 'none';
    } else if (field === 'destinationType') {
      newMappings[index][field] = value as 'database' | 'valkey' | 'model';
    } else if (field === 'source' || field === 'destination') {
      newMappings[index][field] = Array.isArray(value) ? value : [value];
    }
    setMappings(newMappings);
    validateMappings(newMappings);
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
    if (selectedSources.includes(pathStr)) {
      setSelectedSources(selectedSources.filter(p => p !== pathStr));
    } else {
      setSelectedSources([...selectedSources, pathStr]);
    }
  };
  const handleDestinationSelect = (path: string[], type: 'database' | 'valkey' | 'model') => {
    // Toggle selection for destinations
    const pathStr = path.join('.');
    if (selectedDestinations.includes(pathStr)) {
      setSelectedDestinations(selectedDestinations.filter(p => p !== pathStr));
    } else {
      setSelectedDestinations([...selectedDestinations, pathStr]);
    }
    setSelectedDestinationType(type);
  };
  const handleSaveMapping = () => {
    if (selectedSources.length > 0 && selectedDestinations.length > 0) {
      const newMapping: MappingField = {
        source: selectedSources,
        destination: selectedDestinations,
        destinationType: selectedDestinationType,
        transformFunction: selectedTransformation
      };
      setMappings([...mappings, newMapping]);
      setShowAddMapping(false);
      validateMappings([...mappings, newMapping]);
    }
  };
  const handleSaveExtension = () => {
    // This would normally save the new extension from a form
    const newExtension: DataModelExtension = {
      collection: 'accounts',
      field: 'customField' + (dataModelExtensions.length + 1),
      type: 'string',
      required: false
    };
    setDataModelExtensions([...dataModelExtensions, newExtension]);
    setShowAddExtension(false);
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
    return <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" data-id="element-188">
        <div className="bg-white rounded-lg w-full max-w-6xl p-6 max-h-[90vh] overflow-auto" data-id="element-189">
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
                <div className="mb-2 text-sm text-gray-500" data-id="element-232">Data Model</div>
                {renderTree(destinationTree, expandedDestNodes, toggleDestNode, (path, type) => handleDestinationSelect(path, type as 'database' | 'valkey' | 'model'), selectedDestinations, 'destination')}
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
          <div className="flex justify-end space-x-3 mt-6" data-id="element-235">
            <Button variant="secondary" onClick={() => setShowAddMapping(false)} data-id="element-236">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveMapping} disabled={selectedSources.length === 0 || selectedDestinations.length === 0} data-id="element-237">
              Add Mapping
            </Button>
          </div>
        </div>
      </div>;
  };
  const renderAddExtensionModal = () => {
    if (!showAddExtension) return null;
    return <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" data-id="element-238">
        <div className="bg-white rounded-lg w-full max-w-md p-6" data-id="element-239">
          <div className="flex justify-between items-center mb-6" data-id="element-240">
            <h3 className="text-lg font-medium text-gray-900" data-id="element-241">
              Add Data Model Extension
            </h3>
            <button onClick={() => setShowAddExtension(false)} className="text-gray-500 hover:text-gray-700" data-id="element-242">
              <XIcon size={20} data-id="element-243" />
            </button>
          </div>
          <div className="space-y-4" data-id="element-244">
            <div data-id="element-245">
              <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-246">
                Collection
              </label>
              <select className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-247">
                <option value="accounts" data-id="element-248">accounts</option>
                <option value="transactions" data-id="element-249">transactions</option>
              </select>
            </div>
            <div data-id="element-250">
              <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-251">
                Field Name
              </label>
              <input type="text" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., verificationStatus" data-id="element-252" />
            </div>
            <div data-id="element-253">
              <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-254">
                Field Type
              </label>
              <select className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-255">
                <option value="string" data-id="element-256">String</option>
                <option value="number" data-id="element-257">Number</option>
                <option value="boolean" data-id="element-258">Boolean</option>
                <option value="object" data-id="element-259">Object</option>
                <option value="array" data-id="element-260">Array</option>
                <option value="date" data-id="element-261">Date</option>
              </select>
            </div>
            <div className="flex items-center" data-id="element-262">
              <input type="checkbox" id="required-field" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" data-id="element-263" />
              <label htmlFor="required-field" className="ml-2 block text-sm text-gray-900" data-id="element-264">
                Required field
              </label>
            </div>
            <div data-id="element-265">
              <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-266">
                Default Value (optional)
              </label>
              <input type="text" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., PENDING" data-id="element-267" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6" data-id="element-268">
            <Button variant="secondary" onClick={() => setShowAddExtension(false)} data-id="element-269">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveExtension} data-id="element-270">
              Add Extension
            </Button>
          </div>
        </div>
      </div>;
  };
  return <div className="space-y-6" data-id="element-271">
      <div className="flex justify-between items-center" data-id="element-272">
        <h3 className="text-lg font-medium text-gray-900" data-id="element-273">Field Mapping</h3>
        <div className="flex space-x-2" data-id="element-274">
          <button onClick={() => setActiveTab('mapping')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'mapping' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`} data-id="element-275">
            Mappings
          </button>
          <button onClick={() => setActiveTab('extensions')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'extensions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`} data-id="element-276">
            Data Model Extensions
          </button>
        </div>
      </div>
      {activeTab === 'mapping' ? <>
          <div className="flex justify-end mb-4" data-id="element-277">
            <Button variant="secondary" size="sm" onClick={addNewMapping} icon={<PlusIcon size={16} data-id="element-279" />} data-id="element-278">
              Add Mapping
            </Button>
          </div>
          <div className="space-y-6" data-id="element-280">
            {mappings.map((mapping, index) => <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg relative" data-id="element-281">
                <button onClick={() => removeMapping(index)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" data-id="element-282">
                  <XIcon size={16} data-id="element-283" />
                </button>
                <div className="grid grid-cols-3 gap-4 items-start" data-id="element-284">
                  {/* Source Fields */}
                  <div className="space-y-2" data-id="element-285">
                    <label className="block text-sm font-medium text-gray-700" data-id="element-286">
                      Source Fields
                    </label>
                    <div className="p-3 bg-white border border-gray-200 rounded-md" data-id="element-287">
                      {mapping.source.map((source, i) => <div key={i} className="flex items-center mb-1 last:mb-0" data-id="element-288">
                          {source.startsWith('valkey.') ? <ServerIcon size={14} className="mr-2 text-purple-500" data-id="element-289" /> : <FolderIcon size={14} className="mr-2 text-blue-500" data-id="element-290" />}
                          <span className="text-sm" data-id="element-291">{source}</span>
                        </div>)}
                    </div>
                  </div>
                  {/* Transformation */}
                  <div className="flex flex-col items-center justify-center space-y-4" data-id="element-292">
                    <ArrowRightIcon className="text-gray-400" size={20} data-id="element-293" />
                    <select value={mapping.transformFunction} onChange={e => updateMapping(index, 'transformFunction', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" data-id="element-294">
                      <option value="none" data-id="element-295">No Transformation</option>
                      <option value="concatenate" data-id="element-296">Concatenate</option>
                      <option value="sum" data-id="element-297">Sum</option>
                      <option value="split" data-id="element-298">Split</option>
                    </select>
                  </div>
                  {/* Destination Fields */}
                  <div className="space-y-2" data-id="element-299">
                    <label className="block text-sm font-medium text-gray-700" data-id="element-300">
                      Destination
                    </label>
                    <div className="p-3 bg-white border border-gray-200 rounded-md" data-id="element-301">
                      {mapping.destination.map((dest, i) => <div key={i} className="flex items-center mb-1 last:mb-0" data-id="element-302">
                          {mapping.destinationType === 'valkey' ? <ServerIcon size={14} className="mr-2 text-purple-500" data-id="element-303" /> : <DatabaseIcon size={14} className="mr-2 text-green-500" data-id="element-304" />}
                          <span className="text-sm" data-id="element-305">{dest}</span>
                        </div>)}
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500" data-id="element-306">
                        {mapping.destinationType === 'valkey' ? 'Valkey Cache' : 'Database'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>)}
          </div>
        </> : <>
          <div className="flex justify-end mb-4" data-id="element-307">
            <Button variant="secondary" size="sm" onClick={addNewExtension} icon={<PlusIcon size={16} data-id="element-309" />} data-id="element-308">
              Add Data Model Extension
            </Button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-id="element-310">
            <table className="min-w-full divide-y divide-gray-200" data-id="element-311">
              <thead className="bg-gray-50" data-id="element-312">
                <tr data-id="element-313">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-314">
                    Collection
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-315">
                    Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-316">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-317">
                    Required
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-318">
                    Default Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-319">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200" data-id="element-320">
                {dataModelExtensions.map((ext, index) => <tr key={index} data-id="element-321">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-id="element-322">
                      {ext.collection}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-id="element-323">
                      {ext.field}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-id="element-324">
                      {ext.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-id="element-325">
                      {ext.required ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-id="element-326">
                      {ext.defaultValue || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-327">
                      <button onClick={() => removeExtension(index)} className="text-red-500 hover:text-red-700" data-id="element-328">
                        <XIcon size={16} data-id="element-329" />
                      </button>
                    </td>
                  </tr>)}
                {dataModelExtensions.length === 0 && <tr data-id="element-330">
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500" data-id="element-331">
                      No data model extensions defined
                    </td>
                  </tr>}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md" data-id="element-332">
            <div className="flex items-start" data-id="element-333">
              <LayersIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" data-id="element-334" />
              <div data-id="element-335">
                <h4 className="text-sm font-medium text-blue-700" data-id="element-336">
                  About Data Model Extensions
                </h4>
                <p className="mt-1 text-sm text-blue-600" data-id="element-337">
                  Extensions define new fields to be added to the data model.
                  When this connection is published, these changes will be
                  executed in the database. Make sure to define appropriate
                  default values for required fields.
                </p>
              </div>
            </div>
          </div>
        </>}
      {/* Mapping Summary */}
      {activeTab === 'mapping' && mappings.length > 0 && <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200" data-id="element-338">
          <h4 className="text-sm font-medium text-gray-700 mb-2" data-id="element-339">
            Mapping Summary
          </h4>
          <div className="space-y-2" data-id="element-340">
            {mappings.map((mapping, index) => <div key={index} className="text-sm text-gray-600" data-id="element-341">
                <span className="font-medium" data-id="element-342">{mapping.source.join(', ')}</span>
                {mapping.transformFunction !== 'none' && <span className="text-gray-400" data-id="element-343">
                    {' '}
                    ({mapping.transformFunction}){' '}
                  </span>}
                →{' '}
                <span className="font-medium" data-id="element-344">
                  {mapping.destination.join(', ')}
                </span>
                <span className="text-gray-400 ml-2" data-id="element-345">
                  ({mapping.destinationType})
                </span>
              </div>)}
          </div>
        </div>}
      {/* Add Mapping Modal */}
      {renderAddMappingModal()}
      {/* Add Extension Modal */}
      {renderAddExtensionModal()}
    </div>;
};