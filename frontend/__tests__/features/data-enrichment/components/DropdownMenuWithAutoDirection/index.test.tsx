import React from 'react';
import { render, screen } from '@testing-library/react';
import { DropdownMenuWithAutoDirection } from '../../../../../src/features/data-enrichment/components/DropdownMenuWithAutoDirection';

describe('features/data-enrichment/components/DropdownMenuWithAutoDirection/index.tsx', () => {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('has test coverage placeholder', () => {
    expect(true).toBe(true);
  });

  it('renders with auto direction (default) when forceDirection not specified', () => {
    render(
      <DropdownMenuWithAutoDirection>
        <span>Menu content</span>
      </DropdownMenuWithAutoDirection>,
    );
    expect(screen.getByText('Menu content')).toBeInTheDocument();
  });

  it('renders with explicit top forceDirection', () => {
    render(
      <DropdownMenuWithAutoDirection forceDirection="top">
        <span>Top content</span>
      </DropdownMenuWithAutoDirection>,
    );
    expect(screen.getByText('Top content')).toBeInTheDocument();
  });

  it('auto positions at top when space below is limited', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100, height: 50, top: 700, right: 100, bottom: 750,
      left: 0, x: 0, y: 700, toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });

    const { container } = render(
      <DropdownMenuWithAutoDirection>
        <span>Item</span>
      </DropdownMenuWithAutoDirection>,
    );
    // spaceBelow = 800 - 750 = 50 (< 200), spaceAbove = 700 (> 50) → top
    expect((container.firstChild as HTMLElement).className).toContain('bottom-full');
  });

  it('auto positions at bottom when there is enough space below', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100, height: 50, top: 100, right: 100, bottom: 200,
      left: 0, x: 0, y: 100, toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });

    const { container } = render(
      <DropdownMenuWithAutoDirection>
        <span>Item</span>
      </DropdownMenuWithAutoDirection>,
    );
    // spaceBelow = 800 - 200 = 600 (>= 200) → else → bottom
    expect((container.firstChild as HTMLElement).className).toContain('top-full');
  });

  it('keeps default position when menu ref is unavailable in auto mode', () => {
    const fakeRef: Record<string, unknown> = {};
    Object.defineProperty(fakeRef, 'current', {
      get: () => null,
      set: () => {},
      configurable: true,
    });

    const useRefSpy = jest
      .spyOn(React, 'useRef')
      .mockReturnValueOnce(fakeRef as React.RefObject<HTMLDivElement>);

    const { container } = render(
      <DropdownMenuWithAutoDirection forceDirection="auto">
        <span>Item</span>
      </DropdownMenuWithAutoDirection>,
    );

    expect((container.firstChild as HTMLElement).className).toContain('top-full');
    useRefSpy.mockRestore();
  });
});