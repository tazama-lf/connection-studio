import type React from 'react';
import type { Control } from 'react-hook-form';

export interface BaseInputFieldProps {
  name: string;
  label: string | React.ReactNode;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export interface TextInputFieldProps extends BaseInputFieldProps {
  input_type?: string;
  type?: string;
}

export interface PasswordInputFieldProps extends BaseInputFieldProps {}

export interface DateInputFieldProps extends BaseInputFieldProps {}

export interface EndpointNameInputFieldProps extends BaseInputFieldProps {}

export interface VersionInputFieldProps extends BaseInputFieldProps {}

export interface AlphaNumericInputFieldProps extends BaseInputFieldProps {}

export interface MultiLineTextInputFieldProps extends BaseInputFieldProps {
  rows?: number;
}

export interface NumberInputFieldProps extends BaseInputFieldProps {}

export interface DelimiterInputFieldProps extends BaseInputFieldProps {}

export interface DatabaseTableInputFieldProps extends BaseInputFieldProps {}

export interface HostInputFieldProps extends BaseInputFieldProps {}

export interface FilePathInputFieldProps extends BaseInputFieldProps {}

export interface URLInputFieldProps extends BaseInputFieldProps {}

export interface TransactionTypeInputFieldProps extends BaseInputFieldProps {}

export interface ApiPathInputFieldProps extends BaseInputFieldProps {}

export interface SelectFieldProps extends BaseInputFieldProps {
  options: Array<{ value: string | number; label: string }>;
}

export interface AlphaNumericInputFieldWithSpacesProps extends BaseInputFieldProps {}

export declare const isSmallScreen: () => boolean;

export declare const TextInputField: React.FC<TextInputFieldProps>;
export declare const PasswordInputField: React.FC<PasswordInputFieldProps>;
export declare const DateInputField: React.FC<DateInputFieldProps>;
export declare const EndpointNameInputField: React.FC<EndpointNameInputFieldProps>;
export declare const VersionInputField: React.FC<VersionInputFieldProps>;
export declare const AlphaNumericInputField: React.FC<AlphaNumericInputFieldProps>;
export declare const MultiLineTextInputField: React.FC<MultiLineTextInputFieldProps>;
export declare const NumberInputField: React.FC<NumberInputFieldProps>;
export declare const DelimiterInputField: React.FC<DelimiterInputFieldProps>;
export declare const DatabaseTableInputField: React.FC<DatabaseTableInputFieldProps>;
export declare const HostInputField: React.FC<HostInputFieldProps>;
export declare const FilePathInputField: React.FC<FilePathInputFieldProps>;
export declare const URLInputField: React.FC<URLInputFieldProps>;
export declare const TransactionTypeInputField: React.FC<TransactionTypeInputFieldProps>;
export declare const ApiPathInputField: React.FC<ApiPathInputFieldProps>;
export declare const SelectField: React.FC<SelectFieldProps>;
export declare const AlphaNumericInputFieldWithSpaces: React.FC<AlphaNumericInputFieldWithSpacesProps>;
