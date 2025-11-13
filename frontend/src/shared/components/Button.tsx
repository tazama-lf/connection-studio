import React from 'react';
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}
 const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  onClick,
  type = 'button',
  disabled = false
}) => {
  const baseStyles = 'cursor-pointer inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantStyles = {
    primary: disabled 
      ? 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-300'
      : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
    secondary: disabled
      ? 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-300'
      : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 border border-gray-300',
    danger: disabled
      ? 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-300'
      : 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 border border-transparent'
  };
  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  return <button 
    type={type} 
    className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? '' : ''} ${className}`} 
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    data-id="element-34"
  >
      {icon && <span className="mr-2" data-id="element-35">{icon}</span>}
      {children}
    </button>;
};

export { Button };