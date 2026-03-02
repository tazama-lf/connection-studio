import { memo } from 'react';

const Loader = (): React.JSX.Element => (
  <div className="flex items-center justify-center p-8 fixed inset-0 z-50 bg-white bg-opacity-60">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">
      Processing...
    </span>
  </div>
);

export default memo(Loader);