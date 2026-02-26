import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function OptionsManagement() {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newOption, setNewOption] = useState({ category: 'scene', value: '' });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/options`);
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.options);
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOption.value.trim()) {
      alert('Please enter a value');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOption)
      });

      if (!response.ok) {
        throw new Error('Failed to add option');
      }

      alert('Option added successfully!');
      setNewOption({ category: 'scene', value: '' });
      loadOptions();

    } catch (error) {
      alert(`Failed to add option: ${error.message}`);
    }
  };

  const handleDeleteOption = async (category, value) => {
    if (!confirm(`Delete "${value}" from ${category}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/ai/options/${category}/${encodeURIComponent(value)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete option');
      }

      alert('Option deleted!');
      loadOptions();

    } catch (error) {
      alert(`Failed to delete: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading options...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Options Management</h1>

      {/* Add New Option */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Add New Option</h2>
        
        <div className="flex gap-4">
          <select
            value={newOption.category}
            onChange={(e) => setNewOption({ ...newOption, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="scene">Scene</option>
            <option value="mood">Mood</option>
            <option value="style">Style</option>
            <option value="clothingType">Clothing Type</option>
            <option value="color">Color</option>
            <option value="pattern">Pattern</option>
            <option value="accessory">Accessory</option>
            <option value="occasion">Occasion</option>
          </select>

          <input
            type="text"
            value={newOption.value}
            onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
            placeholder="Enter value..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />

          <button
            onClick={handleAddOption}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Add
          </button>
        </div>
      </div>

      {/* Options List */}
      {options && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(options).map(([category, values]) => (
            <div key={category} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 capitalize">
                {category} ({values.length})
              </h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {values.length === 0 ? (
                  <p className="text-gray-500 text-sm">No options yet</p>
                ) : (
                  values.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{option.value}</div>
                        <div className="text-xs text-gray-500">
                          Used: {option.count} times
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteOption(
                          category.slice(0, -1), // Remove 's'
                          option.value
                        )}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
