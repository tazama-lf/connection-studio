import React from 'react';

const ReactJson = ({
  src,
  onEdit,
  onAdd,
  onDelete,
  ...props
}: {
  src?: any;
  onEdit?: (e: any) => void;
  onAdd?: (e: any) => void;
  onDelete?: (e: any) => void;
  [key: string]: any;
}) => (
  <div data-testid="react-json-view">
    {JSON.stringify(src)}
    {onEdit && (
      <button data-testid="rjv-edit" onClick={() => onEdit({ updated_src: src })}>
        Edit JSON
      </button>
    )}
    {onAdd && (
      <button data-testid="rjv-add" onClick={() => onAdd({ updated_src: src })}>
        Add JSON
      </button>
    )}
    {onDelete && (
      <button data-testid="rjv-delete" onClick={() => onDelete({ updated_src: src })}>
        Delete JSON
      </button>
    )}
  </div>
);

export default ReactJson;
