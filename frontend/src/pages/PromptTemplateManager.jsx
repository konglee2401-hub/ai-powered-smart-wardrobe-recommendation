import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Save, Pencil, Trash2, Database, Search } from 'lucide-react';
import promptTemplateService from '../services/promptTemplateService';

const EMPTY_FORM = {
  name: '',
  description: '',
  purpose: '',
  useCase: 'generic',
  style: 'realistic',
  templateType: 'text',
  sourceType: 'manual',
  content: {
    mainPrompt: '',
    negativePrompt: '',
  },
  tags: [],
  usedInPages: [],
};

function PromptTemplateForm({ initialData, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <input className="bg-gray-900 border border-gray-700 rounded px-3 py-2" placeholder="Template name" value={form.name} onChange={(e) => update('name', e.target.value)} />
        <select className="bg-gray-900 border border-gray-700 rounded px-3 py-2" value={form.useCase} onChange={(e) => update('useCase', e.target.value)}>
          <option value="generic">Generic</option>
          <option value="outfit-change">Outfit change</option>
          <option value="product-showcase">Product showcase</option>
          <option value="video-script">Video script</option>
          <option value="ecommerce">Ecommerce</option>
        </select>
      </div>

      <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2" placeholder="Purpose (mục đích)" value={form.purpose || ''} onChange={(e) => update('purpose', e.target.value)} />
      <textarea className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2" rows={2} placeholder="Description" value={form.description} onChange={(e) => update('description', e.target.value)} />
      <textarea className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono text-sm" rows={8} placeholder="Main prompt" value={form.content?.mainPrompt || ''} onChange={(e) => update('content', { ...form.content, mainPrompt: e.target.value })} />
      <textarea className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono text-sm" rows={4} placeholder="Negative prompt (optional)" value={form.content?.negativePrompt || ''} onChange={(e) => update('content', { ...form.content, negativePrompt: e.target.value })} />

      <div className="flex gap-2">
        <button disabled={saving} onClick={() => onSubmit(form)} className="px-4 py-2 bg-green-600 rounded flex items-center gap-2 disabled:opacity-50"><Save size={16} />Save</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
      </div>
    </div>
  );
}

export default function PromptTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await promptTemplateService.getAllTemplates({ isActive: true });
      setTemplates(result.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return templates;
    return templates.filter((template) =>
      [template.name, template.description, template.purpose, template.useCase, template.sourceType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [templates, search]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await promptTemplateService.createTemplate(payload);
      setMessage('Đã tạo template thành công');
      setShowCreate(false);
      await loadTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    if (!editingTemplate?._id) return;
    setSaving(true);
    try {
      await promptTemplateService.updateTemplate(editingTemplate._id, payload);
      setMessage('Đã cập nhật template thành công');
      setEditingTemplate(null);
      await loadTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa template "${name}"?`)) return;
    await promptTemplateService.deleteTemplate(id);
    setMessage('Đã xóa template');
    await loadTemplates();
  };

  const handleSyncHardcoded = async () => {
    setSaving(true);
    try {
      const result = await promptTemplateService.syncHardcodedPrompts();
      setMessage(`Đã sync ${result.count || 0} hardcoded prompts vào DB`);
      await loadTemplates();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prompt Template Manager</h1>
            <p className="text-sm text-gray-400">Scan hardcoded prompts trong project, lưu mục đích + chỗ sử dụng, và CRUD template.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowCreate((v) => !v)} className="px-3 py-2 bg-amber-600 rounded flex items-center gap-2"><Plus size={16} />New Template</button>
            <button onClick={handleSyncHardcoded} disabled={saving} className="px-3 py-2 bg-indigo-600 rounded flex items-center gap-2 disabled:opacity-50"><Database size={16} />Scan & Sync Hardcoded</button>
            <button onClick={loadTemplates} className="px-3 py-2 bg-gray-700 rounded flex items-center gap-2"><RefreshCw size={16} />Refresh</button>
          </div>
        </div>

        {message && <div className="px-3 py-2 bg-green-900/40 border border-green-700 rounded text-sm">{message}</div>}

        {showCreate && <PromptTemplateForm initialData={EMPTY_FORM} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />}

        {editingTemplate && (
          <PromptTemplateForm
            initialData={editingTemplate}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTemplate(null)}
            saving={saving}
          />
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input className="w-full bg-gray-800 border border-gray-700 rounded px-9 py-2" placeholder="Tìm theo tên, purpose, useCase, source..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-gray-400">Loading templates...</div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <div key={template._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-gray-300">{template.description || 'No description'}</p>
                    <p className="text-sm text-indigo-300">🎯 {template.purpose || 'Chưa có purpose'}</p>
                    <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-700 rounded">useCase: {template.useCase}</span>
                      <span className="px-2 py-1 bg-gray-700 rounded">source: {template.sourceType || 'manual'}</span>
                      {template.sourceKey && <span className="px-2 py-1 bg-gray-700 rounded">{template.sourceKey}</span>}
                    </div>
                    {template.usedInPages?.length > 0 && (
                      <div className="text-xs text-gray-400">
                        Used in: {template.usedInPages.map((item) => `${item.page}${item.field ? `.${item.field}` : ''}`).join(' | ')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setEditingTemplate(template)} className="px-2 py-2 bg-blue-600 rounded"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(template._id, template.name)} className="px-2 py-2 bg-red-600 rounded"><Trash2 size={16} /></button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-400">Show prompt content</summary>
                  <pre className="mt-2 bg-gray-900 border border-gray-700 rounded p-3 text-xs whitespace-pre-wrap">{template.content?.mainPrompt}</pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
