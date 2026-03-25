import React from 'react';

export const alpha = (_color: string, _value: number): string => 'rgba(0,0,0,0.1)';

export const styled =
  (Base: any, options?: any) =>
  (styles: any) => {
    const Comp = (props: any) => {
      const theme = {
        spacing: (v: number) => `${v * 8}px`,
        breakpoints: { up: (_k: string) => 'up-sm' },
        palette: { background: { paper: '#fff', default: '#fff' } },
        transitions: {
          create: () => 'transition',
          easing: { sharp: 'sharp' },
          duration: { enteringScreen: 225, leavingScreen: 195 },
        },
      };
      if (typeof styles === 'function') {
        styles({ ...props, theme });
      }
      if (typeof Base === 'string') {
        return React.createElement(Base, props, props.children);
      }
      return <Base {...props} />;
    };

    if (options?.shouldForwardProp) {
      (Comp as any).shouldForwardProp = options.shouldForwardProp;
    }

    return Comp;
  };

export const useTheme = () => ({
  palette: {
    primary: { main: '#1976d2' },
    background: { paper: '#fff', default: '#fff' },
  },
  spacing: (v: number) => `${v * 8}px`,
  breakpoints: { up: (_k: string) => 'up-sm' },
});

export default {
  styled,
  alpha,
  useTheme,
};
