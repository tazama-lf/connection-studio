import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isApprover } from '../../../utils/roleUtils';
import { authApi } from '../services/authApi';
import { loginSchema, validateField, validateForm } from '../../../utils/validationSchemas';

export const Login: React.FC = () => {
  const [email, setemail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setemail(newEmail);
    // Validate on change to provide immediate feedback
    if (newEmail) {
      const error = await validateField(loginSchema, 'email', newEmail);
      setEmailError(error || '');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    // Validate on change to provide immediate feedback
    if (newPassword) {
      const error = await validateField(loginSchema, 'password', newPassword);
      setPasswordError(error || '');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate entire form before submitting
    const errors = await validateForm(loginSchema, { email, password });
    
    if (Object.keys(errors).length > 0) {
      setEmailError(errors.email || '');
      setPasswordError(errors.password || '');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        // Get the token from localStorage and decode user info to check role
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = authApi.decodeToken(token);
          const isUserApprover = userData?.claims ? isApprover(userData.claims) : false;
          navigate(isUserApprover ? '/approver' : '/dashboard');
        } else {
          // Fallback to dashboard if token not found
          navigate('/dashboard');
        }
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check for 401 Unauthorized or specific error messages
      const status = error?.response?.status || error?.status;
      const msg = error?.message || error?.response?.data?.message || '';
      
      if (status === 401 || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('connection')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError('Login failed. Please try again later or contact support if the problem persists.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <img
              className="h-20 w-auto"
              src="/logo.png"
              alt="Tazama Logo"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Tazama Connection Studio
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${emailError ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email Address"
                value={email}
                onChange={handleEmailChange}
                disabled={isLoading}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-500">{emailError}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${passwordError ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading}
              />
              {passwordError && (
                <p className="mt-1 text-xs text-red-500">{passwordError}</p>
              )}
            </div>
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 border border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;