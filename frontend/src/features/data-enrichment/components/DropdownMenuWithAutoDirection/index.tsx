import React, { useRef, useEffect, useState } from 'react';

import type { DropdownMenuWithAutoDirectionProps } from '../../types';

export const DropdownMenuWithAutoDirection: React.FC<DropdownMenuWithAutoDirectionProps> = ({ 
  children, 
  forceDirection = 'auto' 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    
    if (forceDirection !== 'auto') {
      setPosition(forceDirection);
      return;
    }

    
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [forceDirection]);

  return (
    <div
      ref={menuRef}
      className={`absolute right-0 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[10000] ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
    >
      {children}
    </div>
  );
};
