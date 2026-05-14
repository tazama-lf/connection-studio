import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { DropdownMenuWithAutoDirection } from '../../../src/shared/components/DropdownMenuWithAutoDirection';

describe('shared/components/DropdownMenuWithAutoDirection.tsx', () => {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  const originalInnerHeight = window.innerHeight;


  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
    jest.restoreAllMocks();
  });

  it('calls onClose when clicking outside', () => {
    const onClose = jest.fn();
    render(
      <div>
        <DropdownMenuWithAutoDirection onClose={onClose}>
          <div>inside</div>
        </DropdownMenuWithAutoDirection>
        <button data-testid="outside">outside</button>
      </div>,
    );

    fireEvent.mouseDown(
      document.querySelector('[data-testid="outside"]') as Element,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when clicking inside the menu', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DropdownMenuWithAutoDirection onClose={onClose}>
        <div data-testid="inside">inside</div>
      </DropdownMenuWithAutoDirection>,
    );

    fireEvent.mouseDown(getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses forced top direction class', () => {
    const { container } = render(
      <DropdownMenuWithAutoDirection onClose={jest.fn()} forceDirection="top">
        <div>inside</div>
      </DropdownMenuWithAutoDirection>,
    );

    expect((container.firstChild as HTMLElement).className).toContain(
      'bottom-full',
    );
  });

  it('auto positions based on available space', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 50,
      top: 600,
      right: 100,
      bottom: 780,
      left: 0,
      x: 0,
      y: 600,
      toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    const { container } = render(
      <DropdownMenuWithAutoDirection onClose={jest.fn()}>
        <div>inside</div>
      </DropdownMenuWithAutoDirection>,
    );

    expect((container.firstChild as HTMLElement).className).toContain(
      'bottom-full',
    );
  });

  it('auto positions at bottom when there is enough space below', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 50,
      top: 100,
      right: 100,
      bottom: 200,
      left: 0,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });

    const { container } = render(
      <DropdownMenuWithAutoDirection onClose={jest.fn()}>
        <div>inside</div>
      </DropdownMenuWithAutoDirection>,
    );

    expect((container.firstChild as HTMLElement).className).toContain(
      'top-full',
    );
  });

  it('auto positions at bottom when there is enough space below', () => {
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 50,
      top: 100,
      right: 100,
      bottom: 200,
      left: 0,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })) as unknown as typeof HTMLElement.prototype.getBoundingClientRect;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });

    const { container } = render(
      <DropdownMenuWithAutoDirection onClose={jest.fn()}>
        <div>inside</div>
      </DropdownMenuWithAutoDirection>,
    );

    expect((container.firstChild as HTMLElement).className).toContain('top-full');
  });

  it('keeps default position when menu ref is unavailable in auto mode', () => {
    const fakeRef: Record<string, unknown> = {};
    Object.defineProperty(fakeRef, 'current', {
      get: () => null,
      set: () => { },
      configurable: true,
    });

    const useRefSpy = jest
      .spyOn(React, 'useRef')
      .mockReturnValueOnce(fakeRef as React.RefObject<HTMLDivElement>);

    const { container } = render(
      <DropdownMenuWithAutoDirection onClose={jest.fn()} forceDirection="auto">
        <div>inside</div>
      </DropdownMenuWithAutoDirection>,
    );

    expect((container.firstChild as HTMLElement).className).toContain(
      'top-full',
    );
    useRefSpy.mockRestore();
  });
});
