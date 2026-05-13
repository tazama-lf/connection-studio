import React, { useRef, useEffect, useState } from 'react';

interface DropdownMenuWithAutoDirectionProps {
  children: React.ReactNode;
  onClose: () => void;
  forceDirection?: 'top' | 'bottom' | 'auto';
}

export const DropdownMenuWithAutoDirection: React.FC<DropdownMenuWithAutoDirectionProps> = ({
  children,
  onClose,
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('mousedown', handleClick); };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={`absolute right-0 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999] ${position === 'top' ? 'bottom-full mb-2' : 'top-full -mt-3'
        }`}
    >
      {children}
    </div>
  );
};
