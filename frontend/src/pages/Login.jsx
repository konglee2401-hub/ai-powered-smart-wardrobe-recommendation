/**
 * Login Page - Glass / Apple style
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import LogoKG from '../assets/Logo-KG.png';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef(null);

  const nextUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('next') || '/dashboard';
  }, [location.search]);

  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      setGoogleReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  useEffect(() => {
    if (!googleReady || !googleClientId || !googleButtonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        setError('');
        setLoading(true);
        const result = await googleLogin(response.credential, rememberMe);
        setLoading(false);
        if (result.success) {
          navigate(nextUrl, { replace: true });
        } else {
          setError(result.message || 'Google login failed');
        }
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320,
    });
  }, [googleReady, googleLogin, rememberMe, navigate, nextUrl]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password, rememberMe);
    setLoading(false);
    if (result.success) {
      navigate(nextUrl, { replace: true });
      return;
    }
    setError(result.message || 'Login failed. Please try again.');
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
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to continue your creative flow.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="••••••••"
                autoComplete="current-password"
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

          <div className="auth-row">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <span className="auth-link muted">Forgot password?</span>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button type="submit" className="auth-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-google">
            <div ref={googleButtonRef} />
            {!googleClientId && (
              <p className="auth-hint">Add `VITE_GOOGLE_CLIENT_ID` to enable Google login.</p>
            )}
          </div>
        </form>

        <div className="auth-footer">
          <span>New here?</span>
          <Link to={`/register?next=${encodeURIComponent(nextUrl)}`} className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
