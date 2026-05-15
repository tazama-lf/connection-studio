import React from 'react';

jest.mock('@mui/material', () => ({
  useTheme: () => ({
    breakpoints: {
      down: () => '(max-width: 900px)',
    },
  }),
  useMediaQuery: () => false,
}));

import {
  AlphaNumericInputField,
  AlphaNumericInputFieldWithSpaces,
  ApiPathInputField,
  DatabaseTableInputField,
  DateInputField,
  DelimiterInputField,
  EndpointNameInputField,
  FilePathInputField,
  HostInputField,
  isSmallScreen,
  MultiLineTextInputField,
  NumberInputField,
  PasswordInputField,
  SelectField,
  TextInputField,
  TransactionTypeInputField,
  URLInputField,
  VersionInputField,
} from '../../../src/shared/components/FormFields';

const getTextFieldFromControllerElement = (controllerElement, initialValue = '') => {
  const fieldOnChange = jest.fn();
  const textFieldElement = controllerElement.props.render({
    field: {
      onChange: fieldOnChange,
      value: initialValue,
      name: controllerElement.props.name,
    },
  });

  return { textFieldElement, fieldOnChange };
};

const makeEvent = (key = '', value = '') => ({
  key,
  keyCode: key === 'Backspace' ? 8 : key === 'Enter' ? 13 : key === 'Tab' ? 9 : 0,
  ctrlKey: false,
  preventDefault: jest.fn(),
  target: { value },
});

describe('FormFields', () => {
  it('exports field helpers as callable functions', () => {
    expect(typeof TextInputField).toBe('function');
    expect(typeof EndpointNameInputField).toBe('function');
    expect(typeof PasswordInputField).toBe('function');
    expect(typeof DateInputField).toBe('function');
    expect(typeof VersionInputField).toBe('function');
    expect(typeof AlphaNumericInputField).toBe('function');
    expect(typeof MultiLineTextInputField).toBe('function');
    expect(typeof NumberInputField).toBe('function');
    expect(typeof DelimiterInputField).toBe('function');
    expect(typeof DatabaseTableInputField).toBe('function');
    expect(typeof HostInputField).toBe('function');
    expect(typeof FilePathInputField).toBe('function');
    expect(typeof URLInputField).toBe('function');
    expect(typeof TransactionTypeInputField).toBe('function');
    expect(typeof ApiPathInputField).toBe('function');
    expect(typeof SelectField).toBe('function');
    expect(typeof AlphaNumericInputFieldWithSpaces).toBe('function');
    expect(typeof isSmallScreen).toBe('function');
  });

  it('creates base elements for all exported field factories', () => {
    const commonProps = { name: 'field', label: 'Field', control: {} };
    expect(TextInputField(commonProps)).toBeTruthy();
    expect(DateInputField(commonProps)).toBeTruthy();
    expect(EndpointNameInputField(commonProps)).toBeTruthy();
    expect(VersionInputField(commonProps)).toBeTruthy();
    expect(AlphaNumericInputField(commonProps)).toBeTruthy();
    expect(MultiLineTextInputField(commonProps)).toBeTruthy();
    expect(NumberInputField(commonProps)).toBeTruthy();
    expect(DelimiterInputField(commonProps)).toBeTruthy();
    expect(DatabaseTableInputField(commonProps)).toBeTruthy();
    expect(HostInputField(commonProps)).toBeTruthy();
    expect(FilePathInputField(commonProps)).toBeTruthy();
    expect(URLInputField(commonProps)).toBeTruthy();
    expect(TransactionTypeInputField(commonProps)).toBeTruthy();
    expect(ApiPathInputField(commonProps)).toBeTruthy();
    expect(SelectField({ ...commonProps, options: [{ label: 'One', value: '1' }] })).toBeTruthy();
    expect(AlphaNumericInputFieldWithSpaces(commonProps)).toBeTruthy();
  });

  it('PasswordInputField strips spaces and blocks space key', () => {
    const useStateSpy = jest.spyOn(React, 'useState').mockImplementation((initialValue) => [initialValue, jest.fn()]);
    const controller = PasswordInputField({ name: 'password', label: 'Password', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'a b c'));
    expect(fieldOnChange).toHaveBeenCalledWith('abc');

    const spaceKey = makeEvent(' ');
    textFieldElement.props.onKeyDown(spaceKey);
    expect(spaceKey.preventDefault).toHaveBeenCalled();
    useStateSpy.mockRestore();
  });

  it('DateInputField blocks typing and allows only valid year range', () => {
    const controller = DateInputField({ name: 'date', label: 'Date', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    const keyEvent = makeEvent('A');
    textFieldElement.props.onKeyDown(keyEvent);
    expect(keyEvent.preventDefault).toHaveBeenCalled();

    textFieldElement.props.onChange(makeEvent('', '1800-01-01'));
    expect(fieldOnChange).not.toHaveBeenCalledWith('1800-01-01');

    textFieldElement.props.onChange(makeEvent('', '2025-01-01'));
    expect(fieldOnChange).toHaveBeenCalledWith('2025-01-01');

    textFieldElement.props.onChange(makeEvent('', ''));
    expect(fieldOnChange).toHaveBeenCalledWith('');
  });

  it('EndpointNameInputField keeps endpoint-safe characters', () => {
    const controller = EndpointNameInputField({ name: 'endpoint', label: 'Endpoint', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'abc-XYZ_12@$'));
    expect(fieldOnChange).toHaveBeenCalledWith('abc-XYZ_12');

    const badKey = makeEvent('@');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('VersionInputField normalizes value and blocks invalid keys', () => {
    const controller = VersionInputField({ name: 'version', label: 'Version', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'v1..a2'));
    expect(fieldOnChange).toHaveBeenCalledWith('v1.2');

    textFieldElement.props.onChange(makeEvent('', '.12'));
    expect(fieldOnChange).toHaveBeenCalledWith('12');

    textFieldElement.props.onChange(makeEvent('', 'v.99'));
    expect(fieldOnChange).toHaveBeenCalledWith('v99');

    const badKey = makeEvent('x');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('AlphaNumericInputField supports hyphen toggle', () => {
    const hyphenController = AlphaNumericInputField({
      name: 'alpha', label: 'Alpha', control: {}, type: 'text', hyphonAllowed: true,
    });
    const hyphenTextField = getTextFieldFromControllerElement(hyphenController);
    hyphenTextField.textFieldElement.props.onChange(makeEvent('', 'abc-12_$'));
    expect(hyphenTextField.fieldOnChange).toHaveBeenCalledWith('abc-12');

    const noHyphenController = AlphaNumericInputField({
      name: 'alpha', label: 'Alpha', control: {}, type: 'text', hyphonAllowed: false,
    });
    const noHyphenTextField = getTextFieldFromControllerElement(noHyphenController);
    noHyphenTextField.textFieldElement.props.onChange(makeEvent('', 'abc-12'));
    expect(noHyphenTextField.fieldOnChange).toHaveBeenCalledWith('abc12');
  });

  it('NumberInputField strips non-digits and blocks invalid keydown', () => {
    const controller = NumberInputField({ name: 'port', label: 'Port', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', '12ab3'));
    expect(fieldOnChange).toHaveBeenCalledWith('123');

    const badKey = makeEvent('x');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('DelimiterInputField limits to a single allowed character', () => {
    const controller = DelimiterInputField({ name: 'delimiter', label: 'Delimiter', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'a,;'));
    expect(fieldOnChange).toHaveBeenCalledWith(',');

    const badKey = makeEvent('A');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('DatabaseTableInputField lowercases and enforces leading letter', () => {
    const controller = DatabaseTableInputField({ name: 'table', label: 'Table', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', '1__My-Table'));
    expect(fieldOnChange).toHaveBeenCalledWith('mytable');
  });

  it('FilePathInputField normalizes path input', () => {
    const controller = FilePathInputField({ name: 'path', label: 'Path', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'folder//name@.csv'));
    expect(fieldOnChange).toHaveBeenCalledWith('/folder/name.csv');
  });

  it('URLInputField keeps URL-safe characters only', () => {
    const controller = URLInputField({ name: 'url', label: 'URL', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'https://api.test/a b|c'));
    expect(fieldOnChange).toHaveBeenCalledWith('https://api.test/abc');
  });

  it('TransactionTypeInputField and ApiPathInputField sanitize values', () => {
    const txController = TransactionTypeInputField({
      name: 'tx', label: 'Tx', control: {},
    });
    const txTextField = getTextFieldFromControllerElement(txController);
    txTextField.textFieldElement.props.onChange(makeEvent('', 'pacs.008/a_b-'));
    expect(txTextField.fieldOnChange).toHaveBeenCalledWith('pacs008/a_b-');

    const apiPathController = ApiPathInputField({
      name: 'path', label: 'Path', control: {},
    });
    const apiPathTextField = getTextFieldFromControllerElement(apiPathController);
    apiPathTextField.textFieldElement.props.onChange(makeEvent('', 'api//customer data'));
    expect(apiPathTextField.fieldOnChange).toHaveBeenCalledWith('/api/customerdata');

    const disallowedSpace = makeEvent(' ');
    apiPathTextField.textFieldElement.props.onKeyDown(disallowedSpace);
    expect(disallowedSpace.preventDefault).toHaveBeenCalled();

    const allowedBackspace = makeEvent('Backspace');
    apiPathTextField.textFieldElement.props.onKeyDown(allowedBackspace);
    expect(allowedBackspace.preventDefault).not.toHaveBeenCalled();
  });

  it('SelectField and multiline/space helpers build expected props', () => {
    const selectController = SelectField({
      name: 'mode',
      label: 'Mode',
      control: {},
      options: [{ label: 'One', value: '1' }, { label: 'Two', value: '2' }],
    });
    const selectTextField = getTextFieldFromControllerElement(selectController);
    expect(selectTextField.textFieldElement.props.select).toBe(true);
    expect(selectTextField.textFieldElement.props.children).toHaveLength(2);

    const multilineController = MultiLineTextInputField({
      name: 'description',
      label: 'Description',
      control: {},
      rows: 3,
      placeholder: 'Enter text',
    });
    const multilineTextField = getTextFieldFromControllerElement(multilineController);
    expect(multilineTextField.textFieldElement.props.multiline).toBe(true);

    const spacedController = AlphaNumericInputFieldWithSpaces({
      name: 'spaced', label: 'Spaced', control: {}, type: 'text', hyphonAllowed: true,
    });
    const spacedTextField = getTextFieldFromControllerElement(spacedController);
    spacedTextField.textFieldElement.props.onChange(makeEvent('', 'abc - 12 @'));
    expect(spacedTextField.fieldOnChange).toHaveBeenCalledWith('abc - 12 ');
  });

  it('isSmallScreen returns boolean from hook composition', () => {
    expect(typeof isSmallScreen()).toBe('boolean');
  });

  it('AlphaNumericInputFieldWithSpaces handles key filters and non-text passthrough', () => {
    const strictController = AlphaNumericInputFieldWithSpaces({
      name: 'strict',
      label: 'Strict',
      control: {},
      type: 'text',
      hyphonAllowed: false,
    });
    const strictTextField = getTextFieldFromControllerElement(strictController);

    const blockedHyphen = makeEvent('-');
    strictTextField.textFieldElement.props.onKeyDown(blockedHyphen);
    expect(blockedHyphen.preventDefault).toHaveBeenCalled();

    const allowedBackspace = makeEvent('Backspace');
    strictTextField.textFieldElement.props.onKeyDown(allowedBackspace);
    expect(allowedBackspace.preventDefault).not.toHaveBeenCalled();

    const numericController = AlphaNumericInputFieldWithSpaces({
      name: 'numeric',
      label: 'Numeric',
      control: {},
      type: 'number',
      hyphonAllowed: false,
    });
    const numericTextField = getTextFieldFromControllerElement(numericController);
    numericTextField.textFieldElement.props.onChange(makeEvent('', '10-2@x'));
    expect(numericTextField.fieldOnChange).toHaveBeenCalledWith('10-2@x');
  });

  it('PasswordInputField handleMouseDownPassword calls preventDefault (line 109)', () => {
    const useStateSpy = jest.spyOn(React, 'useState').mockImplementation((initialValue) => [initialValue, jest.fn()]);
    const controller = PasswordInputField({ name: 'pw', label: 'PW', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const iconButton = textFieldElement.props.InputProps.endAdornment;
    const mockEvent = { preventDefault: jest.fn() };
    iconButton.props.onMouseDown(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    useStateSpy.mockRestore();
  });

  it('VersionInputField removes v not at start (line 424)', () => {
    const controller = VersionInputField({ name: 'ver', label: 'Ver', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    // 'v' at position 1 (not start) → gets removed
    textFieldElement.props.onChange(makeEvent('', '1v2.3'));
    expect(fieldOnChange).toHaveBeenCalledWith('12.3');
  });

  it('AlphaNumericInputField onKeyDown with invalid char triggers preventDefault (lines 518-525)', () => {
    const controller = AlphaNumericInputField({
      name: 'alpha', label: 'Alpha', control: {}, type: 'text', hyphonAllowed: false,
    });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Invalid char for alphanumeric → preventDefault
    const badKey = makeEvent('!');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();

    // Backspace/Enter/Tab → no preventDefault
    const backspaceKey = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspaceKey);
    expect(backspaceKey.preventDefault).not.toHaveBeenCalled();
  });

  it('NumberInputField onKeyDown with Backspace returns early (line 673)', () => {
    const controller = NumberInputField({ name: 'num', label: 'Num', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const backspaceKey = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspaceKey);
    expect(backspaceKey.preventDefault).not.toHaveBeenCalled();
  });

  it('DatabaseTableInputField onKeyDown blocks invalid chars (lines 854-860)', () => {
    const controller = DatabaseTableInputField({ name: 'tbl', label: 'Table', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Control key → no preventDefault
    const backspaceKey = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspaceKey);
    expect(backspaceKey.preventDefault).not.toHaveBeenCalled();

    // Invalid char → preventDefault
    const badKey = makeEvent('!');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('FilePathInputField onKeyDown blocks invalid chars (lines 1029, 1047-1053)', () => {
    const controller = FilePathInputField({ name: 'fp', label: 'FP', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Control key → returns early (line 1049)
    const backspaceKey = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspaceKey);
    expect(backspaceKey.preventDefault).not.toHaveBeenCalled();

    // Space → preventDefault (short-circuit before isValidPathChar)
    const spaceKey = makeEvent(' ');
    textFieldElement.props.onKeyDown(spaceKey);
    expect(spaceKey.preventDefault).toHaveBeenCalled();

    // Invalid non-space char ('!') → calls isValidPathChar (line 1029), returns false → preventDefault (line 1053)
    const badKey = makeEvent('!');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('URLInputField onKeyDown blocks invalid chars (lines 1122, 1140-1145)', () => {
    const controller = URLInputField({ name: 'url2', label: 'URL2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Control key → returns early (line 1142)
    const backspaceKey = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspaceKey);
    expect(backspaceKey.preventDefault).not.toHaveBeenCalled();

    // Space → preventDefault
    const spaceKey = makeEvent(' ');
    textFieldElement.props.onKeyDown(spaceKey);
    expect(spaceKey.preventDefault).toHaveBeenCalled();

    // Invalid non-space char ('|') → calls isValidURLChar (line 1122), returns false → preventDefault (line 1145)
    const badKey = makeEvent('|');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('TransactionTypeInputField onKeyDown blocks invalid chars (lines 1204, 1222-1228)', () => {
    const controller = TransactionTypeInputField({ name: 'tx2', label: 'TX2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Control key → returns early (line 1224)
    const backspaceKey = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspaceKey);
    expect(backspaceKey.preventDefault).not.toHaveBeenCalled();

    // Invalid char ('!') → calls isValidChar (line 1204), returns false → preventDefault (line 1228)
    const badKey = makeEvent('!');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  it('ApiPathInputField onKeyDown with non-space invalid char (line 1288)', () => {
    const controller = ApiPathInputField({ name: 'path2', label: 'Path2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // '!' is not a space and not a valid path char → calls isValidApiPathChar (line 1288) → preventDefault
    const badKey = makeEvent('!');
    textFieldElement.props.onKeyDown(badKey);
    expect(badKey.preventDefault).toHaveBeenCalled();
  });

  // ─── TextInputField: input_type="date" placeholder (line 55) ───
  it('TextInputField with input_type="date" uses empty placeholder', () => {
    const controller = TextInputField({ name: 'dt', label: 'DT', control: {}, input_type: 'date' });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    expect(textFieldElement.props.placeholder).toBe('');
  });

  // ─── PasswordInputField: handleClickShowPassword and showPassword=true (lines 106-107, 122) ───
  it('PasswordInputField toggle visibility covers handleClickShowPassword and inner setter', () => {
    const mockSetter = jest.fn();
    const useStateSpy = jest.spyOn(React, 'useState').mockImplementation(() => [true, mockSetter]);

    const controller = PasswordInputField({ name: 'pw', label: 'PW', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // showPassword=true → type is 'text' (line 122 true branch)
    expect(textFieldElement.props.type).toBe('text');

    // Invoke the onClick handler → handleClickShowPassword (anonymous_6)
    const iconButton = textFieldElement.props.InputProps.endAdornment;
    iconButton.props.onClick();
    expect(mockSetter).toHaveBeenCalled();

    // Execute the inner setter callback (show) => !show (anonymous_7)
    const toggleFn = mockSetter.mock.calls[0][0];
    expect(toggleFn(false)).toBe(true);
    expect(toggleFn(true)).toBe(false);

    useStateSpy.mockRestore();
  });

  // ─── PasswordInputField: control key and non-space key in onKeyDown (lines 129, 131) ───
  it('PasswordInputField onKeyDown allows control keys and non-space chars', () => {
    const useStateSpy = jest.spyOn(React, 'useState').mockImplementation((init) => [init, jest.fn()]);
    const controller = PasswordInputField({ name: 'pw2', label: 'PW2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Control key returns early (line 129 true branch)
    const backspace = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspace);
    expect(backspace.preventDefault).not.toHaveBeenCalled();

    const tab = makeEvent('Tab');
    textFieldElement.props.onKeyDown(tab);
    expect(tab.preventDefault).not.toHaveBeenCalled();

    // Non-space regular key: does not preventDefault (line 131 false branch)
    const letterKey = makeEvent('a');
    textFieldElement.props.onKeyDown(letterKey);
    expect(letterKey.preventDefault).not.toHaveBeenCalled();

    useStateSpy.mockRestore();
  });

  // ─── DateInputField: Tab key and invalid date (lines 216, 227) ───
  it('DateInputField allows Tab key and rejects invalid date strings', () => {
    const controller = DateInputField({ name: 'date2', label: 'Date2', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    // Tab key returns early (line 216 true branch: Tab passes, false branch: non-Tab blocked)
    const tabKey = makeEvent('Tab');
    textFieldElement.props.onKeyDown(tabKey);
    expect(tabKey.preventDefault).not.toHaveBeenCalled();

    // Invalid date string → isValidDate is false → no onChange (line 227 false branch)
    textFieldElement.props.onChange(makeEvent('', 'not-a-date'));
    expect(fieldOnChange).not.toHaveBeenCalledWith('not-a-date');
  });

  // ─── EndpointNameInputField: control key and valid key (lines 323, 325) ───
  it('EndpointNameInputField onKeyDown allows control keys and valid chars', () => {
    const controller = EndpointNameInputField({ name: 'ep', label: 'EP', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const backspace = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspace);
    expect(backspace.preventDefault).not.toHaveBeenCalled();

    const validKey = makeEvent('a');
    textFieldElement.props.onKeyDown(validKey);
    expect(validKey.preventDefault).not.toHaveBeenCalled();

    const hyphen = makeEvent('-');
    textFieldElement.props.onKeyDown(hyphen);
    expect(hyphen.preventDefault).not.toHaveBeenCalled();
  });

  // ─── VersionInputField: control key and valid key (lines 407, 409) ───
  it('VersionInputField onKeyDown allows control keys and valid version chars', () => {
    const controller = VersionInputField({ name: 'ver2', label: 'Ver2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const backspace = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspace);
    expect(backspace.preventDefault).not.toHaveBeenCalled();

    const digit = makeEvent('1');
    textFieldElement.props.onKeyDown(digit);
    expect(digit.preventDefault).not.toHaveBeenCalled();

    const dot = makeEvent('.');
    textFieldElement.props.onKeyDown(dot);
    expect(dot.preventDefault).not.toHaveBeenCalled();
  });

  // ─── AlphaNumericInputField: type !== text, hyphon=true onKeyDown, valid key (lines 518-539) ───
  it('AlphaNumericInputField with non-text type skips keydown and onChange filters', () => {
    const controller = AlphaNumericInputField({
      name: 'alpha2', label: 'Alpha2', control: {}, type: 'number', hyphonAllowed: false,
    });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    // onKeyDown does nothing for non-text (line 518 false branch)
    const anyKey = makeEvent('$');
    textFieldElement.props.onKeyDown(anyKey);
    expect(anyKey.preventDefault).not.toHaveBeenCalled();

    // onChange passes raw value (line 530 false branch)
    textFieldElement.props.onChange(makeEvent('', 'ab$$12'));
    expect(fieldOnChange).toHaveBeenCalledWith('ab$$12');
  });

  it('AlphaNumericInputField hyphonAllowed=true onKeyDown uses hyphen regex (line 520)', () => {
    const controller = AlphaNumericInputField({
      name: 'alpha3', label: 'Alpha3', control: {}, type: 'text', hyphonAllowed: true,
    });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Valid alphanumeric key passes (line 525 false branch)
    const validKey = makeEvent('a');
    textFieldElement.props.onKeyDown(validKey);
    expect(validKey.preventDefault).not.toHaveBeenCalled();

    // Hyphen allowed with hyphon regex (line 520 true branch of ternary)
    const hyphen = makeEvent('-');
    textFieldElement.props.onKeyDown(hyphen);
    expect(hyphen.preventDefault).not.toHaveBeenCalled();

    // Space is still blocked
    const space = makeEvent(' ');
    textFieldElement.props.onKeyDown(space);
    expect(space.preventDefault).toHaveBeenCalled();
  });

  it('AlphaNumericInputField with input_type="date" uses empty placeholder (line 539)', () => {
    const controller = AlphaNumericInputField({
      name: 'alpha4', label: 'Alpha4', control: {}, input_type: 'date',
    });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);
    expect(textFieldElement.props.placeholder).toBe('');
  });

  // ─── NumberInputField: Ctrl+V and valid digit key (lines 666, 675) ───
  it('NumberInputField onKeyDown allows Ctrl+V and valid digit keys', () => {
    const controller = NumberInputField({ name: 'num2', label: 'Num2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Ctrl+V returns early (line 666 true branch)
    const ctrlV = { key: 'v', keyCode: 86, ctrlKey: true, preventDefault: jest.fn() };
    textFieldElement.props.onKeyDown(ctrlV);
    expect(ctrlV.preventDefault).not.toHaveBeenCalled();

    // Enter key returns early (keyCode 13)
    const enterKey = makeEvent('Enter');
    enterKey.keyCode = 13;
    textFieldElement.props.onKeyDown(enterKey);
    expect(enterKey.preventDefault).not.toHaveBeenCalled();

    // Tab key returns early (keyCode 9)
    const tabKey = makeEvent('Tab');
    tabKey.keyCode = 9;
    textFieldElement.props.onKeyDown(tabKey);
    expect(tabKey.preventDefault).not.toHaveBeenCalled();

    // Digit key passes regex (line 675 false branch)
    const digit = makeEvent('5');
    textFieldElement.props.onKeyDown(digit);
    expect(digit.preventDefault).not.toHaveBeenCalled();
  });

  // ─── DelimiterInputField: control key and valid delimiter key (lines 770, 772) ───
  it('DelimiterInputField onKeyDown allows control keys and valid delimiter chars', () => {
    const controller = DelimiterInputField({ name: 'delim2', label: 'Delim2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const backspace = makeEvent('Backspace');
    textFieldElement.props.onKeyDown(backspace);
    expect(backspace.preventDefault).not.toHaveBeenCalled();

    // Valid delimiter char ',' (line 772 false branch: key is in allowedDelimiters)
    const comma = makeEvent(',');
    textFieldElement.props.onKeyDown(comma);
    expect(comma.preventDefault).not.toHaveBeenCalled();

    const pipe = makeEvent('|');
    textFieldElement.props.onKeyDown(pipe);
    expect(pipe.preventDefault).not.toHaveBeenCalled();
  });

  // ─── DatabaseTableInputField: valid key and input starting with letter (lines 859, 870) ───
  it('DatabaseTableInputField onKeyDown allows valid table name chars (line 859)', () => {
    const controller = DatabaseTableInputField({ name: 'tbl2', label: 'Table2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Valid table name chars pass (line 859 false branch)
    const letter = makeEvent('a');
    textFieldElement.props.onKeyDown(letter);
    expect(letter.preventDefault).not.toHaveBeenCalled();

    const digit = makeEvent('5');
    textFieldElement.props.onKeyDown(digit);
    expect(digit.preventDefault).not.toHaveBeenCalled();

    const underscore = makeEvent('_');
    textFieldElement.props.onKeyDown(underscore);
    expect(underscore.preventDefault).not.toHaveBeenCalled();
  });

  it('DatabaseTableInputField onChange with input starting with a letter keeps it (line 870)', () => {
    const controller = DatabaseTableInputField({ name: 'tbl3', label: 'Table3', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    // Input already starts with a letter → no stripping (line 870 false branch)
    textFieldElement.props.onChange(makeEvent('', 'customers_2025'));
    expect(fieldOnChange).toHaveBeenCalledWith('customers_2025');
  });

  // ─── HostInputField: control key, space, valid IP char (lines 954, 957, 971) ───
  // ─── FilePathInputField: valid path char key (line 1052) ───
  it('FilePathInputField onKeyDown allows valid path chars', () => {
    const controller = FilePathInputField({ name: 'fp2', label: 'FP2', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const slash = makeEvent('/');
    textFieldElement.props.onKeyDown(slash);
    expect(slash.preventDefault).not.toHaveBeenCalled();

    const letter = makeEvent('a');
    textFieldElement.props.onKeyDown(letter);
    expect(letter.preventDefault).not.toHaveBeenCalled();
  });

  // ─── URLInputField: valid URL char key (line 1063) ───
  it('URLInputField onKeyDown allows valid URL chars', () => {
    const controller = URLInputField({ name: 'url3', label: 'URL3', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const colon = makeEvent(':');
    textFieldElement.props.onKeyDown(colon);
    expect(colon.preventDefault).not.toHaveBeenCalled();

    const slash = makeEvent('/');
    textFieldElement.props.onKeyDown(slash);
    expect(slash.preventDefault).not.toHaveBeenCalled();
  });

  // ─── TransactionTypeInputField: valid char (line 1144) ───
  it('TransactionTypeInputField onKeyDown allows valid chars', () => {
    const controller = TransactionTypeInputField({ name: 'tx3', label: 'TX3', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const letter = makeEvent('p');
    textFieldElement.props.onKeyDown(letter);
    expect(letter.preventDefault).not.toHaveBeenCalled();

    const slash = makeEvent('/');
    textFieldElement.props.onKeyDown(slash);
    expect(slash.preventDefault).not.toHaveBeenCalled();
  });

  // ─── ApiPathInputField: valid char (line 1227) ───
  it('ApiPathInputField onKeyDown allows valid path chars', () => {
    const controller = ApiPathInputField({ name: 'path3', label: 'Path3', control: {} });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    const letter = makeEvent('c');
    textFieldElement.props.onKeyDown(letter);
    expect(letter.preventDefault).not.toHaveBeenCalled();

    const underscore = makeEvent('_');
    textFieldElement.props.onKeyDown(underscore);
    expect(underscore.preventDefault).not.toHaveBeenCalled();
  });

  // ─── SelectField: isSmall=true (lines 1408, 1422) ───
  it('SelectField applies small-screen styles when isSmall is true', () => {
    const mui = require('@mui/material');
    const origMediaQuery = mui.useMediaQuery;
    mui.useMediaQuery = () => true;

    const controller = SelectField({
      name: 'mode2', label: 'Mode2', control: {},
      options: [{ label: 'One', value: '1' }],
    });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // PaperProps has maxWidth when isSmall is true (line 1408 true branch)
    const paperSx = textFieldElement.props.SelectProps.MenuProps.PaperProps.sx;
    expect(paperSx.maxWidth).toBe('500px');

    // Menu sx has MuiPaper-root styles (line 1422 true branch)
    const menuSx = textFieldElement.props.SelectProps.MenuProps.sx;
    expect(menuSx['& .MuiPaper-root']).toBeDefined();

    mui.useMediaQuery = origMediaQuery;
  });

  // ─── AlphaNumericInputFieldWithSpaces: type !== text, hyphon onKeyDown, input_type date (lines 1514-1535) ───
  it('AlphaNumericInputFieldWithSpaces with non-text type skips filters', () => {
    const controller = AlphaNumericInputFieldWithSpaces({
      name: 'spaced2', label: 'Spaced2', control: {}, type: 'number', hyphonAllowed: false,
    });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    // onKeyDown does nothing for non-text (line 1514 false branch)
    const anyKey = makeEvent('$');
    textFieldElement.props.onKeyDown(anyKey);
    expect(anyKey.preventDefault).not.toHaveBeenCalled();

    // onChange passes raw value (line 1527 false branch)
    textFieldElement.props.onChange(makeEvent('', '$$abc'));
    expect(fieldOnChange).toHaveBeenCalledWith('$$abc');
  });

  it('AlphaNumericInputFieldWithSpaces hyphonAllowed=true onKeyDown uses hyphen regex (line 1516)', () => {
    const controller = AlphaNumericInputFieldWithSpaces({
      name: 'spaced3', label: 'Spaced3', control: {}, type: 'text', hyphonAllowed: true,
    });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);

    // Valid key passes (line 1521 false branch)
    const letter = makeEvent('a');
    textFieldElement.props.onKeyDown(letter);
    expect(letter.preventDefault).not.toHaveBeenCalled();

    // Hyphen allowed (line 1516 true branch of ternary)
    const hyphen = makeEvent('-');
    textFieldElement.props.onKeyDown(hyphen);
    expect(hyphen.preventDefault).not.toHaveBeenCalled();
  });

  // ─── HostInputField: onChange with value not starting with dot (line 971) ───
  it('HostInputField onChange with value not starting with dot skips strip (line 971)', () => {
    const controller = HostInputField({ name: 'host3', label: 'Host3', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', '192.168.1.1'));
    expect(fieldOnChange).toHaveBeenCalledWith('192.168.1.1');
  });

  // ─── FilePathInputField: onChange with value already starting with / (line 1063) ───
  it('FilePathInputField onChange with value already starting with / skips prefix (line 1063)', () => {
    const controller = FilePathInputField({ name: 'fp3', label: 'FP3', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', '/inbound/data.csv'));
    expect(fieldOnChange).toHaveBeenCalledWith('/inbound/data.csv');
  });

  // ─── ApiPathInputField: onChange with value already starting with / (line 1322) ───
  it('ApiPathInputField onChange with value already starting with / skips prefix (line 1322)', () => {
    const controller = ApiPathInputField({ name: 'path4', label: 'Path4', control: {} });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', '/customer/data'));
    expect(fieldOnChange).toHaveBeenCalledWith('/customer/data');
  });

  // ─── AlphaNumericInputFieldWithSpaces: onChange with type=text hyphonAllowed=false (line 1527) ───
  it('AlphaNumericInputFieldWithSpaces onChange type=text hyphonAllowed=false strips invalid chars (line 1527)', () => {
    const controller = AlphaNumericInputFieldWithSpaces({
      name: 'spaced5', label: 'Spaced5', control: {}, type: 'text', hyphonAllowed: false,
    });
    const { textFieldElement, fieldOnChange } = getTextFieldFromControllerElement(controller);

    textFieldElement.props.onChange(makeEvent('', 'abc 12-@'));
    expect(fieldOnChange).toHaveBeenCalledWith('abc 12');
  });

  it('AlphaNumericInputFieldWithSpaces with input_type="date" uses empty placeholder (line 1535)', () => {
    const controller = AlphaNumericInputFieldWithSpaces({
      name: 'spaced4', label: 'Spaced4', control: {}, input_type: 'date',
    });
    const { textFieldElement } = getTextFieldFromControllerElement(controller);
    expect(textFieldElement.props.placeholder).toBe('');
  });
});
