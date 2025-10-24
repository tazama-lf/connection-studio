import React, { useRef, useEffect, useState } from 'react';

interface DropdownMenuWithAutoDirectionProps {
  children: React.ReactNode;
}

export const DropdownMenuWithAutoDirection: React.FC<DropdownMenuWithAutoDirectionProps> = ({ children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openUp, setOpenUp] = useState(false);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      // If the menu would overflow the bottom, open upwards
      if (rect.bottom > viewportHeight && rect.height < rect.top) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, []);

  return (
    <div
      ref={menuRef}
      className={`absolute right-0 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 ${openUp ? 'mb-2 bottom-full' : 'mt-1 top-full'}`}
      style={{
        ...(openUp ? { bottom: '100%' } : { top: '100%' })
      }}
    >
      {children}
    </div>
  );
};
