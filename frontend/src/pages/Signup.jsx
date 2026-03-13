/**
 * Signup Page - Glass / Apple style
 */

import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import LogoKG from '../assets/Logo-KG.png';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('next') || '/dashboard';
  }, [location.search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await register({ name, email, password, rememberMe });
    setLoading(false);
    if (result.success) {
      navigate(nextUrl, { replace: true });
      return;
    }
    setError(result.message || 'Sign up failed. Please try again.');
  }

  return (
    <div className="auth-shell apple-typography">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-card">
        <div className="auth-brand">
          <img src={LogoKG} alt="K-Creative Studio" className="auth-logo" />
          <div>
            <p className="auth-kicker">K-Creative Studio</p>
            <h1 className="auth-title">Create your studio access</h1>
            <p className="auth-subtitle">Start building with a secure, personalized workspace.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Name</span>
            <div className="auth-input">
              <UserRound className="auth-input-icon" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Studio Operator"
                autoComplete="name"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input">
              <Mail className="auth-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@studio.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input">
              <Lock className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="auth-input-action"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <div className="auth-input">
              <Lock className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </div>
          </label>

          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember this device</span>
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button type="submit" className="auth-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to={`/login?next=${encodeURIComponent(nextUrl)}`} className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
