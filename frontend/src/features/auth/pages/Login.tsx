import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(userId, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" data-id="element-1184">
      <div className="max-w-md w-full space-y-8" data-id="element-1185">
        <div data-id="element-1186">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900" data-id="element-1187">
            Tazama Connection Studio
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600" data-id="element-1188">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} data-id="element-1189">
          <div className="rounded-md shadow-sm -space-y-px" data-id="element-1190">
            <div data-id="element-1191">
              <label htmlFor="user-id" className="sr-only" data-id="element-1192">
                User ID
              </label>
              <input id="user-id" name="userId" type="text" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="User ID" value={userId} onChange={e => setUserId(e.target.value)} data-id="element-1193" />
            </div>
            <div data-id="element-1194">
              <label htmlFor="password" className="sr-only" data-id="element-1195">
                Password
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} data-id="element-1196" />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm text-center" data-id="element-1197">{error}</div>}
          <div data-id="element-1198">
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" data-id="element-1199">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>;
};

export default Login;