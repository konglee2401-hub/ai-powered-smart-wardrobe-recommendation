/**
 * Plan Manager - Admin only
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import api from '../services/api';

const emptyPlan = {
  name: '',
  code: '',
  description: '',
  durationDays: 30,
  permissions: { menu: [], api: [], queue: [], job: [] },
  access: { aiProviders: [], browserAutomations: [] },
  limits: {
    storage: { maxGB: null },
    scrape: { maxPerDay: null, maxPerRun: null },
    mashup: { maxConcurrent: null },
    generationDaily: { image: null, video: null, voice: null, oneClick: null },
  },
  isActive: true,
  isDefault: false,
  isLocked: false,
};

const menuOptions = ['generation', 'video-pipeline', 'prompt-templates', 'gallery', 'analytics', 'settings'];
const apiOptions = ['generation', 'video-pipeline', 'browser-automation', 'tts'];

export default function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [assigning, setAssigning] = useState({});

  const loadPlans = async () => {
    const res = await api.get('/plans');
    const payload = res?.data || res;
    setPlans(payload?.data || []);
  };

  const loadUsers = async () => {
    const res = await api.get('/admin-access/users');
    const payload = res?.data || res;
    setUsers(payload?.data || []);
  };

  useEffect(() => {
    loadPlans();
    loadUsers();
  }, []);

  const handleEdit = (plan) => {
    setEditing(plan ? JSON.parse(JSON.stringify(plan)) : { ...emptyPlan });
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = { ...editing };
      const res = editing._id
        ? await api.put(`/plans/${editing._id}`, payload)
        : await api.post('/plans', payload);
      const result = res?.data || res;
      if (!result?.success) {
        setError(result?.message || 'Failed to save plan');
      } else {
        setMessage('Plan saved.');
        await loadPlans();
        setEditing(null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (plan.isLocked) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.delete(`/plans/${plan._id}`);
      const result = res?.data || res;
      if (!result?.success) {
        setError(result?.message || 'Failed to delete plan');
      } else {
        await loadPlans();
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete plan');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayValue = (path, value) => {
    setEditing((prev) => {
      const next = { ...prev };
      const [key, sub] = path.split('.');
      const list = new Set(next[key][sub]);
      if (list.has(value)) list.delete(value);
      else list.add(value);
      next[key][sub] = Array.from(list);
      return next;
    });
  };

  const handleLimitChange = (path, value) => {
    setEditing((prev) => {
      const next = { ...prev };
      const [k1, k2, k3] = path.split('.');
      if (k3) next[k1][k2][k3] = value === '' ? null : Number(value);
      else next[k1][k2] = value === '' ? null : Number(value);
      return next;
    });
  };

  const handleAssign = async (userId, planId) => {
    setAssigning((prev) => ({ ...prev, [userId]: true }));
    setError('');
    try {
      const res = await api.post('/subscriptions/assign', { userId, planId });
      const result = res?.data || res;
      if (!result?.success) {
        setError(result?.message || 'Failed to assign plan');
      }
    } catch (err) {
      setError(err?.message || 'Failed to assign plan');
    } finally {
      setAssigning((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const defaultPlan = useMemo(() => plans.find((plan) => plan.isDefault), [plans]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-6">
        <PageHeaderBar
          icon={<ShieldCheck className="h-4 w-4 text-sky-300" />}
          title="Plans & Limits"
          subtitle="Configure subscription packages and quotas"
          meta="Default plans are locked and cannot be deleted."
          className="apple-surface-panel"
          actions={(
            <button
              className="apple-secondary-button flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium"
              onClick={() => handleEdit(null)}
            >
              <Plus className="h-4 w-4" />
              New plan
            </button>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="apple-surface-panel rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Plans</h2>
          <p className="mt-1 text-sm text-slate-400">Manage durations, permissions, and usage limits.</p>

          <div className="mt-5 space-y-3">
            {plans.map((plan) => (
              <div key={plan._id} className="flex items-center justify-between rounded-[1.4rem] bg-white/[0.04] p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{plan.name} ({plan.code})</p>
                  <p className="text-xs text-slate-400">
                    {plan.durationDays} days · {plan.isDefault ? 'Default' : 'Custom'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.08]"
                    onClick={() => handleEdit(plan)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-400/10 disabled:opacity-50"
                    onClick={() => handleDelete(plan)}
                    disabled={plan.isLocked}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="apple-surface-panel rounded-[2rem] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Assign plan</h2>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user._id} className="rounded-[1.4rem] bg-white/[0.04] p-4">
                <div className="mb-3 text-sm text-white">{user.email}</div>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-100"
                    defaultValue={defaultPlan?._id || ''}
                    onChange={(e) => handleAssign(user._id, e.target.value)}
                  >
                    <option value="" disabled>Choose plan</option>
                    {plans.map((plan) => (
                      <option key={plan._id} value={plan._id}>{plan.name}</option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 disabled:opacity-50"
                    onClick={() => handleAssign(user._id, defaultPlan?._id)}
                    disabled={!defaultPlan || assigning[user._id]}
                  >
                    Assign default
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <section className="apple-surface-panel mt-5 rounded-[2rem] p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{editing._id ? 'Edit plan' : 'Create plan'}</h2>
            <button
              className="apple-secondary-button flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              Save plan
            </button>
          </div>

          {(message || error) && (
            <div className={`mb-4 rounded-[1.2rem] px-4 py-3 text-sm ${error ? 'bg-rose-500/15 text-rose-200' : 'bg-emerald-400/15 text-emerald-200'}`}>
              {error || message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="auth-field">
              <span>Name</span>
              <input
                className="plan-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label className="auth-field">
              <span>Code</span>
              <input
                className="plan-input"
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              />
            </label>
            <label className="auth-field">
              <span>Description</span>
              <input
                className="plan-input"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <label className="auth-field">
              <span>Duration (days)</span>
              <input
                type="number"
                className="plan-input"
                value={editing.durationDays}
                onChange={(e) => setEditing({ ...editing, durationDays: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Menu permissions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {menuOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayValue('permissions.menu', item)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      editing.permissions.menu.includes(item) ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">API access</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {apiOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayValue('permissions.api', item)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      editing.permissions.api.includes(item) ? 'bg-sky-400/20 text-sky-200' : 'bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Generation limits / day</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                {['image', 'video', 'voice', 'oneClick'].map((key) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span>{key}</span>
                    <input
                      type="number"
                      className="plan-input"
                      value={editing.limits.generationDaily[key] ?? ''}
                      onChange={(e) => handleLimitChange(`limits.generationDaily.${key}`, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mashup & scrape</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                <label className="flex flex-col gap-1">
                  <span>Scrape/day</span>
                  <input
                    type="number"
                    className="plan-input"
                    value={editing.limits.scrape.maxPerDay ?? ''}
                    onChange={(e) => handleLimitChange('limits.scrape.maxPerDay', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Scrape/run</span>
                  <input
                    type="number"
                    className="plan-input"
                    value={editing.limits.scrape.maxPerRun ?? ''}
                    onChange={(e) => handleLimitChange('limits.scrape.maxPerRun', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Mashup concurrent</span>
                  <input
                    type="number"
                    className="plan-input"
                    value={editing.limits.mashup.maxConcurrent ?? ''}
                    onChange={(e) => handleLimitChange('limits.mashup.maxConcurrent', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Storage GB</span>
                  <input
                    type="number"
                    className="plan-input"
                    value={editing.limits.storage.maxGB ?? ''}
                    onChange={(e) => handleLimitChange('limits.storage.maxGB', e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
