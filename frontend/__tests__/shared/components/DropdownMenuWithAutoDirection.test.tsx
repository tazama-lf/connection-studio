import React from 'react';
import { render } from '@testing-library/react';
import { DropdownMenuWithAutoDirection } from '../../../src/features/data-enrichment/components/DropdownMenuWithAutoDirection';

describe('DropdownMenuWithAutoDirection', () => {
  const originalGetBoundingClientRect =
    HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('renders children inside the dropdown', () => {
    render(
      <DropdownMenuWithAutoDirection>
        <div>Menu Item 1</div>
        <div>Menu Item 2</div>
      </DropdownMenuWithAutoDirection>,
    );
    expect(document.body.textContent).toContain('Menu Item 1');
    expect(document.body.textContent).toContain('Menu Item 2');
  });

  it('positions at bottom when forceDirection is "bottom"', () => {
    const { container } = render(
      <DropdownMenuWithAutoDirection forceDirection="bottom">
        <div>Item</div>
      </DropdownMenuWithAutoDirection>,
    );
    const menu = container.firstChild as HTMLElement;
    expect(menu.className).toContain('top-full');
  });

  it('positions at top when forceDirection is "top"', () => {
    const { container } = render(
      <DropdownMenuWithAutoDirection forceDirection="top">
        <div>Item</div>
      </DropdownMenuWithAutoDirection>,
    );
    const menu = container.firstChild as HTMLElement;
    expect(menu.className).toContain('bottom-full');
  });

  it('auto positions at top when space below is limited', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 100,
      top: 500,
      right: 100,
      bottom: 760,
      left: 0,
      x: 0,
      y: 500,
      toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    const { container } = render(
      <DropdownMenuWithAutoDirection>
        <div>Item</div>
      </DropdownMenuWithAutoDirection>,
    );
    const menu = container.firstChild as HTMLElement;
    expect(menu.className).toContain('bottom-full');
  });

  it('auto positions at bottom when there is enough space below', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 100,
      top: 100,
      right: 100,
      bottom: 200,
      left: 0,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    const { container } = render(
      <DropdownMenuWithAutoDirection>
        <div>Item</div>
      </DropdownMenuWithAutoDirection>,
    );
    const menu = container.firstChild as HTMLElement;
    expect(menu.className).toContain('top-full');
  });
});
