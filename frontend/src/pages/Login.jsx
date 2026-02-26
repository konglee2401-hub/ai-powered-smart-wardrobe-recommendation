/**
 * Login Page
 * User authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';

    const token = localStorage.getItem('token');
    if (!token) {
      setEmail(testEmail);
      setPassword(testPassword);

      const autoLogin = async () => {
        try {
          // 1. Attempt initial login
          const loginResponse = await axios.post('/api/auth/login', { email: testEmail, password: testPassword });
          if (loginResponse.data.success) {
            localStorage.setItem('token', loginResponse.data.data.token);
            navigate('/dashboard');
            return;
          }
        } catch (loginError) {
          // If login failed, it might be due to incorrect password hash (e.g., manual db entry)
          // Proceed to delete and re-register
          console.log('Initial login failed for test user. Attempting to delete and re-register.');
        }

        try {
          // 2. Try to delete the test user (in case of old, invalid password hash)
          await axios.delete('/api/test/delete-test-user', { data: { email: testEmail } });
          console.log('Test user deleted for re-registration.');
        } catch (deleteError) {
          if (deleteError.response && deleteError.response.status === 404) {
            console.log('Test user not found, proceeding to register.');
          } else {
            console.error('Error during test user deletion:', deleteError);
            // If deletion fails for other reasons, we might still proceed, but log it.
          }
        }

        try {
          // 3. Register the test user
          await axios.post('/api/auth/register', { name: 'Test User', email: testEmail, password: testPassword });
          console.log('Test user registered successfully.');

          // 4. Attempt login again after successful registration
          const finalLoginResponse = await axios.post('/api/auth/login', { email: testEmail, password: testPassword });
          if (finalLoginResponse.data.success) {
            localStorage.setItem('token', finalLoginResponse.data.data.token);
            navigate('/dashboard');
          } else {
            setError(finalLoginResponse.data.message || 'Auto-login failed after re-registration.');
          }
        } catch (err) {
          setError(err.response?.data?.message || 'Auto-login process failed.');
          console.error('Auto-login process failed:', err);
        }
      };
      autoLogin();
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.data.success) {
        // Optionally store token or user info in local storage/context
        localStorage.setItem('token', response.data.data.token);
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{t('login.title')}</h1>
          <p className="text-gray-600 mt-2">{t('login.subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-purple-600 hover:text-purple-700 font-medium">
                {t('login.signUp')}
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-600 hover:text-gray-800">
            {t('login.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
