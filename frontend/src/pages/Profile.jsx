/**
 * Profile Page - basic user info + change password
 */

import React, { useState } from 'react';
import { KeyRound, Mail, UserRound } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import api from '../services/api';
import PageHeaderBar from '../components/PageHeaderBar';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      const payload = res?.data || res;
      if (!payload?.success) {
        setError(payload?.message || 'Failed to update password');
      } else {
        setMessage('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <div className="mb-6">
        <PageHeaderBar
          icon={<UserRound className="h-4 w-4 text-sky-300" />}
          title="Profile"
          subtitle="Account details and security"
          meta="Manage basic information and update your password."
          className="apple-surface-panel"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="apple-surface-panel rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Basic information</h2>
          <p className="mt-1 text-sm text-slate-400">Your profile details from the auth system.</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <UserRound className="h-4 w-4 text-sky-300" />
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Name</span>
                  <span className="text-base text-white">{user?.name || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Mail className="h-4 w-4 text-emerald-300" />
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</span>
                  <span className="text-base text-white">{user?.email || '-'}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <KeyRound className="h-4 w-4 text-violet-300" />
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Role</span>
                  <span className="text-base text-white">{user?.role || 'user'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="apple-surface-panel rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Change password</h2>
          <p className="mt-1 text-sm text-slate-400">Update credentials for safer access.</p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <label className="auth-field">
              <span>Current password</span>
              <div className="auth-input">
                <KeyRound className="auth-input-icon" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>New password</span>
              <div className="auth-input">
                <KeyRound className="auth-input-icon" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Confirm new password</span>
              <div className="auth-input">
                <KeyRound className="auth-input-icon" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            {error && <div className="auth-error">{error}</div>}
            {message && (
              <div className="rounded-[1.2rem] bg-emerald-400/15 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            )}

            <button type="submit" className="auth-primary w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
