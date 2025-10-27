import React, { useRef, useEffect, useState } from 'react';

interface DropdownMenuWithAutoDirectionProps {
  children: React.ReactNode;
  forceDirection?: 'top' | 'bottom' | 'auto';
}

export const DropdownMenuWithAutoDirection: React.FC<DropdownMenuWithAutoDirectionProps> = ({ 
  children, 
  forceDirection = 'auto' 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    // If forceDirection is specified and not 'auto', use it directly
    if (forceDirection !== 'auto') {
      setPosition(forceDirection);
      return;
    }

    // Check available space and set position
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there's less than 200px below but more space above, position above
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
      className={`absolute right-0 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999] ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
    >
      {children}
    </div>
  );
};
