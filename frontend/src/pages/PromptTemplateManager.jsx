/**
 * Prompt Template Manager
 * Comprehensive template management interface with advanced features
 */

import React, { useState, useEffect } from 'react';
import {
  Plus, Copy, Trash2, Edit, Search, Filter, Download, Upload,
  ChevronDown, ChevronUp, Lock, Eye, EyeOff, Loader2,
  AlertCircle, CheckCircle, FileText, Settings, Tag
} from 'lucide-react';
import promptTemplateService from '../services/promptTemplateService';
import { useTranslation } from 'react-i18next';

const PromptTemplateManager = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedTemplates, setExpandedTemplates] = useState(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    useCase: 'generic',
    style: 'realistic',
    templateType: 'text',
    content: {
      mainPrompt: '',
      negativePrompt: ''
    },
    fields: [],
    tags: [],
    usedInPages: []
  });

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchTerm, filterType, sortBy]);

  // ============================================================
  // FETCH DATA
  // ============================================================

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await promptTemplateService.getAllTemplates({ isActive: true });
      setTemplates(result.data || []);
    } catch (err) {
      setError('Không thể lấy danh sách templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FILTER & SORT
  // ============================================================

  const filterAndSortTemplates = () => {
    let filtered = [...templates];

    // Apply filters
    if (filterType !== 'all') {
      if (filterType === 'core') {
        filtered = filtered.filter(t => t.isCore);
      } else if (filterType === 'custom') {
        filtered = filtered.filter(t => !t.isCore);
      } else {
        filtered = filtered.filter(t => t.useCase === filterType);
      }
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tags?.some(tag => tag?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'usage') {
      filtered.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    }

    setFilteredTemplates(filtered);
  };

  // ============================================================
  // CREATE/UPDATE TEMPLATE
  // ============================================================

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await promptTemplateService.createTemplate(formData);
      setTemplates([...templates, result.data]);
      setSuccess('Template tạo thành công!');
      setShowCreateForm(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Không thể tạo template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (id) => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError('');

    try {
      const result = await promptTemplateService.updateTemplate(id, selectedTemplate);
      setTemplates(templates.map(t => t._id === id ? result.data : t));
      setSuccess('Template cập nhật thành công!');
      setSelectedTemplate(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Không thể cập nhật template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // DELETE TEMPLATE
  // ============================================================

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa template này?')) return;

    setLoading(true);
    setError('');

    try {
      await promptTemplateService.deleteTemplate(id);
      setTemplates(templates.filter(t => t._id !== id));
      setSuccess('Template xóa thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Không thể xóa template. Có thể đây là template core.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CLONE TEMPLATE
  // ============================================================

  const handleCloneTemplate = async (id, originalName) => {
    const newName = prompt('Tên mới cho template clone:', `${originalName} (Copy)`);
    if (!newName) return;

    setLoading(true);
    setError('');

    try {
      const result = await promptTemplateService.cloneTemplate(id, newName);
      setTemplates([...templates, result.data]);
      setSuccess('Template cloned thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Không thể clone template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FORM HELPERS
  // ============================================================

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      useCase: 'generic',
      style: 'realistic',
      templateType: 'text',
      content: {
        mainPrompt: '',
        negativePrompt: ''
      },
      fields: [],
      tags: [],
      usedInPages: []
    });
  };

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTemplates(newExpanded);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-amber-500" />
            Prompt Template Manager
          </h1>
          <p className="text-gray-400">
            Quản lý toàn bộ prompt templates sử dụng trong hệ thống
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-700/50 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-green-200">{success}</p>
          </div>
        )}

        {/* Top Actions */}
        <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Tạo Template Mới
            </button>
            <button
              onClick={fetchTemplates}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition"
            >
              <Search className="w-4 h-4" />
              Làm mới
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="px-3 py-1 bg-gray-800 rounded text-sm">
              <span className="text-gray-400">Tổng: </span>
              <span className="font-bold text-white">{templates.length}</span>
            </div>
            <div className="px-3 py-1 bg-gray-800 rounded text-sm">
              <span className="text-gray-400">Hiển thị: </span>
              <span className="font-bold text-white">{filteredTemplates.length}</span>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Tạo Template Mới</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Tên template"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none"
                  required
                />
                <select
                  value={formData.useCase}
                  onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                  className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none"
                >
                  <option value="generic">Generic</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="video-script">Video Script</option>
                  <option value="product-showcase">Product Showcase</option>
                  <option value="outfit-change">Outfit Change</option>
                </select>
              </div>

              <textarea
                placeholder="Mô tả template"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none"
                rows="2"
              />

              <textarea
                placeholder="Main Prompt"
                value={formData.content.mainPrompt}
                onChange={(e) => setFormData({
                  ...formData,
                  content: { ...formData.content, mainPrompt: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none"
                rows="4"
                required
              />

              <textarea
                placeholder="Negative Prompt (Optional)"
                value={formData.content.negativePrompt}
                onChange={(e) => setFormData({
                  ...formData,
                  content: { ...formData.content, negativePrompt: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none"
                rows="3"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded font-medium transition flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Tạo Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters & Search */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm kiếm templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-amber-500 outline-none"
          >
            <option value="all">Tất cả loại</option>
            <option value="core">Core Templates</option>
            <option value="custom">Custom Templates</option>
            <option value="generic">Generic</option>
            <option value="ecommerce">E-commerce</option>
            <option value="video-script">Video Script</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-amber-500 outline-none"
          >
            <option value="recent">Mới nhất</option>
            <option value="alphabetical">A-Z</option>
            <option value="usage">Hầu hết sử dụng</option>
          </select>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Không có templates nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map(template => (
              <div
                key={template._id}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition"
              >
                {/* Template Header */}
                <div
                  className="p-4 flex items-start justify-between cursor-pointer hover:bg-gray-700/50 transition"
                  onClick={() => toggleExpanded(template._id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                      {template.isCore && (
                        <span className="px-2 py-1 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Core
                        </span>
                      )}
                      {template.usageCount > 0 && (
                        <span className="px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded text-xs text-blue-300">
                          Mức sử dụng: {template.usageCount}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{template.description}</p>
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {template.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneTemplate(template._id, template.name);
                      }}
                      className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-blue-400 transition"
                      title="Clone template"
                    >
                      <Copy className="w-5 h-5" />
                    </button>

                    {!template.isCore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template._id);
                        }}
                        className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition"
                        title="Delete template"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(template._id);
                      }}
                      className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition"
                    >
                      {expandedTemplates.has(template._id) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Template Details */}
                {expandedTemplates.has(template._id) && (
                  <div className="border-t border-gray-700 p-4 bg-gray-700/20 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Main Prompt:
                      </label>
                      <div className="p-3 bg-gray-800 rounded text-gray-300 text-sm font-mono max-h-32 overflow-y-auto">
                        {template.content?.mainPrompt}
                      </div>
                    </div>

                    {template.content?.negativePrompt && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Negative Prompt:
                        </label>
                        <div className="p-3 bg-gray-800 rounded text-gray-300 text-sm font-mono max-h-32 overflow-y-auto">
                          {template.content.negativePrompt}
                        </div>
                      </div>
                    )}

                    {template.fields && template.fields.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Dynamic Fields:
                        </label>
                        <div className="space-y-2">
                          {template.fields.map(field => (
                            <div key={field.id} className="p-2 bg-gray-800 rounded text-sm">
                              <span className="font-mono text-amber-400">{field.id}</span>
                              <span className="text-gray-500"> - </span>
                              <span className="text-gray-300">{field.label}</span>
                              <span className="text-gray-600"> ({field.type})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {template.usedInPages && template.usedInPages.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Sử dụng trong:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {template.usedInPages.map((loc, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300"
                            >
                              {loc.page} {loc.step && `(Step ${loc.step})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                      Tạo: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptTemplateManager;
