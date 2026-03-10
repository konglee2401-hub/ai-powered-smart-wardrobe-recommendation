import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Database, Pencil, Plus, RefreshCw, Save, Search, Settings, Trash2 } from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import promptTemplateService from '../services/promptTemplateService';

const EMPTY_FORM = {
  name: '',
  nameVi: '',
  description: '',
  purpose: '',
  useCase: 'generic',
  style: 'realistic',
  templateType: 'text',
  sourceType: 'manual',
  content: { mainPrompt: '', negativePrompt: '' },
  tagsText: '',
  fields: [],
  usedInPages: [],
  assignmentTargets: [],
};

const EMPTY_FIELD = {
  id: '',
  label: '',
  source: 'manual',
  type: 'text',
  optionCategory: '',
  editable: true,
  allowCustomValue: true,
  runtimeKey: '',
  placeholder: '',
  defaultValue: '',
  optionsText: '',
};

const EMPTY_LOCATION = { page: '', step: '', context: '', field: '' };

const toForm = (template) => ({
  name: template?.name || '',
  nameVi: template?.nameVi || '',
  description: template?.description || '',
  purpose: template?.purpose || '',
  useCase: template?.useCase || 'generic',
  style: template?.style || 'realistic',
  templateType: template?.templateType || 'text',
  sourceType: template?.sourceType || 'manual',
  content: {
    mainPrompt: template?.content?.mainPrompt || '',
    negativePrompt: template?.content?.negativePrompt || '',
  },
  tagsText: (template?.tags || []).join(', '),
  fields: (template?.fields || []).map((field) => ({
    ...EMPTY_FIELD,
    ...field,
    editable: field.editable !== false,
    allowCustomValue: field.allowCustomValue !== false,
    optionsText: (field.options || []).map((option) => `${option.value}${option.label && option.label !== option.value ? ` | ${option.label}` : ''}`).join('\n'),
  })),
  usedInPages: template?.usedInPages?.length ? template.usedInPages : [],
  assignmentTargets: template?.assignmentTargets?.length ? template.assignmentTargets : [],
});

const toPayload = (form) => ({
  ...form,
  tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
  fields: form.fields
    .filter((field) => field.id.trim())
    .map((field) => ({
      ...field,
      id: field.id.trim(),
      label: field.label.trim() || field.id.trim(),
      optionCategory: field.optionCategory.trim(),
      runtimeKey: field.runtimeKey.trim(),
      options: String(field.optionsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [value, label] = line.split('|');
          return { value: value.trim(), label: (label || value).trim(), description: '' };
        }),
    })),
  usedInPages: form.usedInPages.filter((item) => item.page || item.context || item.field).map((item) => ({ ...item, step: item.step === '' ? null : Number(item.step) })),
  assignmentTargets: form.assignmentTargets.filter((item) => item.page || item.context || item.field).map((item) => ({ ...item, step: item.step === '' ? null : Number(item.step) })),
});

function Chip({ children, tone = 'slate' }) {
  const styles = {
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
    blue: 'border-sky-700/60 bg-sky-950/30 text-sky-300',
    green: 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300',
    amber: 'border-amber-700/60 bg-amber-950/30 text-amber-300',
  };
  return <span className={`rounded border px-2 py-1 text-[11px] ${styles[tone]}`}>{children}</span>;
}

function MiniLocationEditor({ title, value, onChange, suggestions = [] }) {
  const update = (index, key, nextValue) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: nextValue } : item));
  const add = (preset = EMPTY_LOCATION) => onChange([...(value || []), { ...preset }]);
  const remove = (index) => onChange(value.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
        <span>{title}</span>
        <button type="button" onClick={() => add()} className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300">Add</button>
      </div>
      {(value || []).map((item, index) => (
        <div key={`${title}-${index}`} className="grid gap-2 md:grid-cols-[1fr_70px_1fr_1fr_36px]">
          <input value={item.page || ''} onChange={(event) => update(index, 'page', event.target.value)} placeholder="page" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100" />
          <input value={item.step ?? ''} onChange={(event) => update(index, 'step', event.target.value)} placeholder="step" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100" />
          <input value={item.context || ''} onChange={(event) => update(index, 'context', event.target.value)} placeholder="context" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100" />
          <input value={item.field || ''} onChange={(event) => update(index, 'field', event.target.value)} placeholder="field" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100" />
          <button type="button" onClick={() => remove(index)} className="rounded border border-rose-700/60 bg-rose-950/30 text-rose-300"><Trash2 size={13} className="mx-auto" /></button>
        </div>
      ))}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 6).map((item) => (
            <button key={`${title}-${item.page}-${item.context}-${item.field}`} type="button" onClick={() => add(item)} className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-400">
              {item.page}/{item.context || 'default'}/{item.field || 'mainPrompt'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PromptTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [metadata, setMetadata] = useState({ optionCategories: [], templateTypes: [], locations: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view');
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ search: '', useCase: '', type: '', state: 'all' });
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [templateResult, metadataResult] = await Promise.all([
        promptTemplateService.getAllTemplates({ isActive: true }),
        promptTemplateService.getTemplateMetadata(),
      ]);
      const nextTemplates = templateResult.data || [];
      setTemplates(nextTemplates);
      setMetadata(metadataResult.data || { optionCategories: [], templateTypes: [], locations: [] });
      if (!selectedId && nextTemplates.length) setSelectedId(nextTemplates[0]._id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => templates.find((item) => item._id === selectedId) || null, [templates, selectedId]);

  useEffect(() => {
    if (selected && mode !== 'create') setForm(toForm(selected));
  }, [selected, mode]);

  const filtered = useMemo(() => templates.filter((item) => {
    if (filters.useCase && item.useCase !== filters.useCase) return false;
    if (filters.type && item.templateType !== filters.type) return false;
    if (filters.state === 'assigned' && !(item.assignmentTargets || []).length) return false;
    if (filters.state === 'unassigned' && (item.assignmentTargets || []).length) return false;
    if (!filters.search.trim()) return true;
    return [item.name, item.description, item.purpose, item.useCase, item.sourceKey].filter(Boolean).join(' ').toLowerCase().includes(filters.search.trim().toLowerCase());
  }), [templates, filters]);

  const stats = useMemo(() => ({
    total: templates.length,
    core: templates.filter((item) => item.isCore).length,
    assigned: templates.filter((item) => (item.assignmentTargets || []).length).length,
  }), [templates]);

  const setFormValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setContentValue = (key, value) => setForm((prev) => ({ ...prev, content: { ...prev.content, [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (mode === 'create') {
        const result = await promptTemplateService.createTemplate(payload);
        setSelectedId(result.data?._id || null);
        setMessage(`Created: ${payload.name}`);
      } else if (selected?._id) {
        await promptTemplateService.updateTemplate(selected._id, payload);
        setMessage(`Updated: ${payload.name}`);
      }
      setMode('view');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected?._id || !window.confirm(`Delete "${selected.name}"?`)) return;
    await promptTemplateService.deleteTemplate(selected._id);
    setSelectedId(null);
    setMessage(`Deleted: ${selected.name}`);
    await load();
  };

  const clone = async () => {
    if (!selected?._id) return;
    const result = await promptTemplateService.cloneTemplate(selected._id, `${selected.name} (Custom)`);
    setSelectedId(result.data?._id || null);
    setMode('edit');
    setMessage(`Cloned: ${result.data?.name || selected.name}`);
    await load();
  };

  const activate = async () => {
    if (!selected?._id) return;
    await promptTemplateService.assignTemplate(selected._id, toPayload(form).assignmentTargets);
    setMessage(`Activated assignments for: ${selected.name}`);
    await load();
  };

  const previewRender = async () => {
    if (!selected?._id) return;
    const sampleValues = Object.fromEntries((form.fields || []).map((field) => [field.id, field.defaultValue || '']));
    const result = await promptTemplateService.renderTemplate(selected._id, sampleValues);
    setPreview(result.data);
  };

  const addField = () => setFormValue('fields', [...form.fields, { ...EMPTY_FIELD }]);
  const updateField = (index, key, value) => setFormValue('fields', form.fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, [key]: value } : field));
  const removeField = (index) => setFormValue('fields', form.fields.filter((_, fieldIndex) => fieldIndex !== index));

  return (
    <div className="prompt-template-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden lg:-mx-6 lg:-mb-6 lg:-mt-6">
      <PageHeaderBar
        icon={<Settings className="h-4 w-4 text-cyan-400" />}
        title="Prompt Templates"
        meta="Manage system prompts and templates"
        className="h-16"
      />

      <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-600">Prompt Template Console</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Manage every system prompt</h2>
              <p className="mt-2 max-w-4xl text-sm text-slate-600">Catalog prompt Ä‘ang dÃ¹ng, vá»‹ trÃ­ sá»­ dá»¥ng, má»¥c Ä‘Ã­ch sá»­ dá»¥ng, CRUD template tÃ¹y biáº¿n, khÃ³a placeholder theo option category, vÃ  gÃ¡n template active cho flow tháº­t.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setMode('create'); setSelectedId(null); setForm(EMPTY_FORM); }} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-600 transition hover:bg-cyan-400/15"><Plus size={14} />New</button>
              <button onClick={async () => { setSaving(true); try { const result = await promptTemplateService.syncHardcodedPrompts(); setMessage(`Synced ${result.count || 0} hardcoded prompts`); await load(); } finally { setSaving(false); } }} className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-400/15"><Database size={14} />Scan & Sync</button>
              <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-600 transition hover:text-slate-900"><RefreshCw size={14} className={`${loading ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
          </div>

          {message && <div className="rounded-xl border border-emerald-300/30 bg-emerald-100/50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="studio-card-shell rounded-[1rem] p-4"><div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">All</div><div className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</div></div>
            <div className="studio-card-shell rounded-[1rem] p-4"><div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Core</div><div className="mt-2 text-2xl font-semibold text-slate-900">{stats.core}</div></div>
            <div className="studio-card-shell rounded-[1rem] p-4"><div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Assigned</div><div className="mt-2 text-2xl font-semibold text-slate-900">{stats.assigned}</div></div>
          </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search prompt, purpose, source" className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-100" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input value={filters.useCase} onChange={(event) => setFilters((prev) => ({ ...prev, useCase: event.target.value }))} placeholder="Use case" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100" />
              <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"><option value="">All types</option>{(metadata.templateTypes || []).map((type) => <option key={type} value={type}>{type}</option>)}</select>
              <select value={filters.state} onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"><option value="all">All</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select>
            </div>
            <div className="max-h-[calc(100vh-310px)] space-y-3 overflow-y-auto pr-1">
              {filtered.map((item) => (
                <button key={item._id} type="button" onClick={() => { setSelectedId(item._id); setMode('view'); }} className={`w-full rounded-2xl border p-4 text-left ${selectedId === item._id && mode !== 'create' ? 'border-sky-500 bg-sky-950/20' : 'border-slate-800 bg-slate-950/70'}`}>
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.name}</span>{item.isCore && <Chip tone="blue">core</Chip>}{(item.assignmentTargets || []).length > 0 && <Chip tone="green">active</Chip>}{item.sourceType === 'hardcoded-scan' && <Chip tone="amber">scanned</Chip>}</div>
                  <div className="mt-2 text-xs text-slate-400">{item.purpose || item.description || 'No purpose specified.'}</div>
                  <div className="mt-3 flex flex-wrap gap-2"><Chip>{item.useCase}</Chip><Chip>{item.templateType}</Chip><Chip>{item.fields?.length || 0} tokens</Chip></div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            {(!selected && mode !== 'create') ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">Select a template or create a new one.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{mode === 'create' ? 'Create Template' : mode === 'edit' ? 'Edit Template' : 'Inspect Template'}</div>
                    <h2 className="mt-2 text-2xl font-semibold">{mode === 'create' ? 'New Prompt Template' : selected?.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">{selected?.isCore && <Chip tone="blue">core</Chip>}{(selected?.assignmentTargets || []).length > 0 && <Chip tone="green">currently assigned</Chip>}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected && <button onClick={clone} className="rounded-xl border border-sky-700/60 bg-sky-950/30 px-3 py-2 text-xs text-sky-300"><Copy size={14} className="mr-2 inline" />Clone</button>}
                    {selected && !selected.isCore && mode === 'view' && <button onClick={() => setMode('edit')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300"><Pencil size={14} className="mr-2 inline" />Edit</button>}
                    {selected && !selected.isCore && <button onClick={remove} className="rounded-xl border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"><Trash2 size={14} className="mr-2 inline" />Delete</button>}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={form.name} onChange={(event) => setFormValue('name', event.target.value)} placeholder="Name" disabled={selected?.isCore && mode !== 'create'} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" />
                      <input value={form.nameVi} onChange={(event) => setFormValue('nameVi', event.target.value)} placeholder="Vietnamese name" disabled={selected?.isCore && mode !== 'create'} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" />
                      <input value={form.useCase} onChange={(event) => setFormValue('useCase', event.target.value)} placeholder="Use case" disabled={selected?.isCore && mode !== 'create'} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" />
                      <select value={form.templateType} onChange={(event) => setFormValue('templateType', event.target.value)} disabled={selected?.isCore && mode !== 'create'} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"><option value="text">text</option><option value="image">image</option><option value="video">video</option><option value="hybrid">hybrid</option></select>
                      <input value={form.purpose} onChange={(event) => setFormValue('purpose', event.target.value)} placeholder="Purpose" disabled={selected?.isCore && mode !== 'create'} className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" />
                      <textarea value={form.description} onChange={(event) => setFormValue('description', event.target.value)} rows={2} placeholder="Description" disabled={selected?.isCore && mode !== 'create'} className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" />
                    </div>

                    <textarea value={form.content.mainPrompt} onChange={(event) => setContentValue('mainPrompt', event.target.value)} rows={14} disabled={selected?.isCore && mode !== 'create'} placeholder="Main prompt. Example: Character wearing {product_type} in {scene}" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-xs leading-6 text-slate-100 disabled:opacity-60" />
                    <textarea value={form.content.negativePrompt} onChange={(event) => setContentValue('negativePrompt', event.target.value)} rows={5} disabled={selected?.isCore && mode !== 'create'} placeholder="Negative prompt" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-xs leading-6 text-slate-100 disabled:opacity-60" />

                    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500"><span>Placeholders</span><button type="button" onClick={addField} className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300">Add</button></div>
                      {form.fields.map((field, index) => (
                        <div key={`field-${index}`} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                          <div className="grid gap-2 md:grid-cols-4">
                            <input value={field.id} onChange={(event) => updateField(index, 'id', event.target.value)} placeholder="token_id" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" />
                            <input value={field.label} onChange={(event) => updateField(index, 'label', event.target.value)} placeholder="label" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" />
                            <select value={field.source} onChange={(event) => updateField(index, 'source', event.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"><option value="manual">manual</option><option value="option">option</option><option value="system">system</option></select>
                            <select value={field.type} onChange={(event) => updateField(index, 'type', event.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"><option value="text">text</option><option value="textarea">textarea</option><option value="select">select</option><option value="radio">radio</option></select>
                          </div>
                          <div className="grid gap-2 md:grid-cols-4">
                            <select value={field.optionCategory} onChange={(event) => updateField(index, 'optionCategory', event.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"><option value="">option category</option>{(metadata.optionCategories || []).map((item) => <option key={item} value={item}>{item}</option>)}</select>
                            <input value={field.runtimeKey} onChange={(event) => updateField(index, 'runtimeKey', event.target.value)} placeholder="runtime path" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" />
                            <input value={field.defaultValue} onChange={(event) => updateField(index, 'defaultValue', event.target.value)} placeholder="default" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100" />
                            <button type="button" onClick={() => removeField(index)} className="rounded border border-rose-700/60 bg-rose-950/30 px-2 py-1.5 text-xs text-rose-300">Remove</button>
                          </div>
                          {(field.type === 'select' || field.type === 'radio') && <textarea value={field.optionsText || ''} onChange={(event) => updateField(index, 'optionsText', event.target.value)} rows={3} placeholder="value | Label" className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-slate-100" />}
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <MiniLocationEditor title="Catalog Usage" value={form.usedInPages} onChange={(value) => setFormValue('usedInPages', value)} suggestions={metadata.locations || []} />
                      <MiniLocationEditor title="Active Assignment" value={form.assignmentTargets} onChange={(value) => setFormValue('assignmentTargets', value)} suggestions={metadata.locations || []} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selected && (
                      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Status</div>
                        <div className="flex flex-wrap gap-2">{selected.isCore && <Chip tone="blue">cannot delete</Chip>}{(selected.assignmentTargets || []).length > 0 && <Chip tone="green">system is using this template</Chip>}</div>
                        <div>Version: <span className="text-slate-200">{selected.version || 1}</span></div>
                        <div>Usage count: <span className="text-slate-200">{selected.usageCount || 0}</span></div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={activate} className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-300"><CheckCircle2 size={14} className="mr-2 inline" />Activate</button>
                          <button onClick={previewRender} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-300">Preview</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Preview</div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">Positive Prompt</div>
                        <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-200">{preview?.prompt || 'Save and preview to inspect final render.'}</pre>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">Negative Prompt</div>
                        <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-300">{preview?.negativePrompt || 'No negative prompt.'}</pre>
                      </div>
                    </div>

                    <div className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-3 text-xs leading-6 text-sky-100/80">
                      Core template khÃ´ng xÃ³a Ä‘Æ°á»£c. Muá»‘n Ä‘á»•i wording tá»«ng cÃ¢u, hÃ£y clone rá»“i gÃ¡n láº¡i á»Ÿ pháº§n <span className="font-semibold text-sky-200">Active Assignment</span>. Vá»›i placeholder source = <span className="font-mono text-sky-200">option</span>, nÃªn Ä‘á»ƒ há»‡ thá»‘ng bÆ¡m tá»« option hiá»‡n cÃ³ thay vÃ¬ nháº­p tay.
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                  {(mode === 'create' || mode === 'edit') && <button onClick={save} disabled={saving || (selected?.isCore && mode !== 'create')} className="rounded-xl border border-sky-700/60 bg-sky-950/30 px-4 py-2 text-sm text-sky-300 disabled:opacity-50"><Save size={15} className="mr-2 inline" />{saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}</button>}
                  {(mode === 'edit' || mode === 'create') && <button onClick={() => { setMode(selected ? 'view' : 'create'); if (selected) setForm(toForm(selected)); }} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">Cancel</button>}
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

