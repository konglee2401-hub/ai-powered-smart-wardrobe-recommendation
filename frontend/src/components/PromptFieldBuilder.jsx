/**
 * Prompt Field Builder Component
 * Build and manage dynamic fields/placeholders for templates
 */

import React, { useState } from 'react';
import {
  Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, Copy
} from 'lucide-react';

const PromptFieldBuilder = ({ fields = [], onFieldsChange }) => {
  const [editingField, setEditingField] = useState(null);
  const [expandedField, setExpandedField] = useState(null);
  const [newField, setNewField] = useState({
    id: '',
    label: '',
    description: '',
    type: 'text',
    placeholder: '',
    defaultValue: '',
    editable: true,
    category: 'general'
  });

  const fieldTypes = [
    { value: 'text', label: 'Text Input', icon: '📝' },
    { value: 'textarea', label: 'Text Area', icon: '📄' },
    { value: 'select', label: 'Dropdown Select', icon: '📋' },
    { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
    { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { value: 'number', label: 'Number', icon: '🔢' },
    { value: 'date', label: 'Date', icon: '📅' },
    { value: 'color', label: 'Color Picker', icon: '🎨' }
  ];

  // ============================================================
  // FIELD MANAGEMENT
  // ============================================================

  const addField = () => {
    if (!newField.id || !newField.label) {
      alert('ID và Label không được để trống');
      return;
    }

    const updatedFields = [...fields, { ...newField, _id: Date.now() }];
    onFieldsChange(updatedFields);
    setNewField({
      id: '',
      label: '',
      description: '',
      type: 'text',
      placeholder: '',
      defaultValue: '',
      editable: true,
      category: 'general'
    });
  };

  const updateField = (index, updates) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    onFieldsChange(updatedFields);
  };

  const deleteField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    onFieldsChange(updatedFields);
    setEditingField(null);
  };

  const duplicateField = (index) => {
    const field = fields[index];
    const duplicate = { ...field, _id: Date.now(), id: `${field.id}_copy` };
    const updatedFields = [...fields, duplicate];
    onFieldsChange(updatedFields);
  };

  const moveField = (index, direction) => {
    const updatedFields = [...fields];
    if (direction === 'up' && index > 0) {
      [updatedFields[index], updatedFields[index - 1]] = [updatedFields[index - 1], updatedFields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [updatedFields[index], updatedFields[index + 1]] = [updatedFields[index + 1], updatedFields[index]];
    }
    onFieldsChange(updatedFields);
  };

  // ============================================================
  // FIELD PREVIEW
  // ============================================================

  const renderFieldPreview = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            disabled
            className="w-full px-3 py-2 bg-gray-700 text-gray-500 rounded border border-gray-600 text-sm"
          />
        );
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            disabled
            className="w-full px-3 py-2 bg-gray-700 text-gray-500 rounded border border-gray-600 text-sm resize-none"
            rows="2"
          />
        );
      case 'select':
      case 'radio':
        return (
          <div className="text-sm text-gray-500">
            <span className="px-3 py-1 bg-gray-700 rounded border border-gray-600 inline-block">
              {field.label} (selector)
            </span>
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" disabled className="w-4 h-4" />
            <span className="text-sm text-gray-500">{field.label}</span>
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder}
            disabled
            className="w-full px-3 py-2 bg-gray-700 text-gray-500 rounded border border-gray-600 text-sm"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            disabled
            className="w-full px-3 py-2 bg-gray-700 text-gray-500 rounded border border-gray-600 text-sm"
          />
        );
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded border border-gray-600"
              style={{ backgroundColor: field.defaultValue || '#808080' }}
            ></div>
            <span className="text-sm text-gray-500">{field.label}</span>
          </div>
        );
      default:
        return <span className="text-sm text-gray-500">Unknown type</span>;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-4">
      {/* Add New Field Form */}
      <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <h4 className="font-semibold text-white mb-4">Thêm trường mới</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              ID (Placeholder) *
            </label>
            <input
              type="text"
              placeholder="e.g., outfit1, mood, scene"
              value={newField.id}
              onChange={(e) => setNewField({ ...newField, id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sẽ được dùng như: {newField.id ? `{${newField.id}}` : '{placeholder}'}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Label hiển thị *
            </label>
            <input
              type="text"
              placeholder="e.g., Outfit Style"
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Loại trường *
            </label>
            <select
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
            >
              {fieldTypes.map(ft => (
                <option key={ft.value} value={ft.value}>
                  {ft.icon} {ft.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Category
            </label>
            <input
              type="text"
              placeholder="e.g., appearance, setting"
              value={newField.category}
              onChange={(e) => setNewField({ ...newField, category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">
            Mô tả
          </label>
          <textarea
            placeholder="Mô tả chi tiết về trường này"
            value={newField.description}
            onChange={(e) => setNewField({ ...newField, description: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm resize-none"
            rows="2"
          />
        </div>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newField.editable}
              onChange={(e) => setNewField({ ...newField, editable: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-gray-300">Cho phép người dùng sửa</span>
          </label>
        </div>

        <button
          onClick={addField}
          className="mt-4 w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Thêm trường
        </button>
      </div>

      {/* Fields List */}
      <div className="space-y-2">
        <h4 className="font-semibold text-white">
          Các trường đã thêm ({fields.length})
        </h4>

        {fields.length === 0 ? (
          <div className="p-8 text-center bg-gray-800 border border-gray-700 rounded-lg">
            <p className="text-gray-400">Chưa có trường nào được thêm</p>
            <p className="text-sm text-gray-500 mt-1">
              Thêm trường để tạo dynamic placeholders trong prompt
            </p>
          </div>
        ) : (
          fields.map((field, index) => (
            <div
              key={field._id || index}
              className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-gray-600 transition"
            >
              {/* Field Header */}
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-700/50"
                onClick={() => setExpandedField(expandedField === index ? null : index)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 text-sm font-semibold">
                      {field.id}
                    </span>
                    <span className="text-gray-500">-</span>
                    <span className="text-white text-sm truncate">{field.label}</span>
                    <span className="text-gray-600 text-xs">
                      ({field.type})
                    </span>
                    {!field.editable && (
                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                        Read-only
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateField(index);
                    }}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-blue-400 transition"
                    title="Copy field"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveField(index, 'up');
                    }}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-gray-200 disabled:opacity-50 transition"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveField(index, 'down');
                    }}
                    disabled={index === fields.length - 1}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-gray-200 disabled:opacity-50 transition"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteField(index);
                    }}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition"
                    title="Delete field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedField(expandedField === index ? null : index);
                    }}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400"
                  >
                    {expandedField === index ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Field Details */}
              {expandedField === index && (
                <div className="border-t border-gray-700 p-4 bg-gray-700/20 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Preview:
                    </label>
                    <div className="p-3 bg-gray-800 rounded border border-gray-700">
                      {renderFieldPreview(field)}
                    </div>
                  </div>

                  {field.description && (
                    <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-blue-200">
                      <strong>Mô tả:</strong> {field.description}
                    </div>
                  )}

                  {field.category && (
                    <div className="text-sm">
                      <span className="text-gray-400">Category: </span>
                      <span className="text-gray-200 font-mono">{field.category}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <span>Type: </span>
                    <span className="font-mono">{field.type}</span>
                    <span className="ml-4">ID: </span>
                    <span className="font-mono">{field.id}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Helper Info */}
      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-sm text-blue-200">
        <div className="flex gap-2 mb-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Cách sử dụng:</strong>
            <ul className="mt-2 space-y-1 ml-4 list-disc">
              <li>ID là placeholder sẽ được dùng trong prompt: {'{outfit1}, {mood}...'}</li>
              <li>Người dùng sẽ nhập giá trị cho từng trường</li>
              <li>Hệ thống sẽ tự thay thế placeholders bằng giá trị đó</li>
              <li>Đặt "Cho phép sửa" để kiểm soát xem trường có thể sửa được không</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptFieldBuilder;
