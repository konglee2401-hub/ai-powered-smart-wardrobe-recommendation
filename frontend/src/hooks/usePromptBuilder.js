/**
 * Smart Fashion Prompt Builder - Custom Hook
 * Phase 2: Revised with all fixes
 * 
 * Features:
 * 1. Centralized State Management
 * 2. API Integration
 * 3. Error Handling
 * 4. Loading States
 * 5. Local Storage Persistence
 */

import { useState, useCallback, useEffect } from 'react';
import {
  generatePrompt as apiGeneratePrompt,
  enhancePrompt as apiEnhancePrompt,
  validateInputs as apiValidateInputs,
  getPromptStats as apiGetPromptStats
} from '../utils/apiClient';

// ============ CUSTOM HOOK ============

export const usePromptBuilder = () => {
  // ============ STATE ============

  const [inputs, setInputs] = useState({
    age: '20-30',
    gender: 'female',
    style: 'elegant',
    colors: 'white and black',
    material: 'silk blend',
    setting: 'studio',
    mood: 'elegant'
  });

  const [draftPrompt, setDraftPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // ============ EFFECTS ============

  // Load from localStorage on mount
  useEffect(() => {
    const savedInputs = localStorage.getItem('promptBuilderInputs');
    if (savedInputs) {
      try {
        setInputs(JSON.parse(savedInputs));
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }
    }
  }, []);

  // ============ HANDLERS ============

  /**
   * Update input field
   */
  const updateInput = useCallback((name, value) => {
    setInputs(prev => {
      const updated = { ...prev, [name]: value };
      localStorage.setItem('promptBuilderInputs', JSON.stringify(updated));
      return updated;
    });
    setError('');
  }, []);

  /**
   * Generate prompt
   */
  const generatePrompt = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setValidationErrors([]);

    try {
      // Validate inputs
      const validation = await apiValidateInputs(inputs);
      if (!validation.success) {
        setValidationErrors(validation.errors || []);
        setError('Validation failed');
        setLoading(false);
        return;
      }

      // Generate prompt
      const result = await apiGeneratePrompt(inputs);
      if (!result.success) {
        setError(result.error || 'Failed to generate prompt');
        setLoading(false);
        return;
      }

      setDraftPrompt(result.prompt);
      setStats(result.stats);
      setEnhancedPrompt('');
      setSuccess('Prompt generated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error generating prompt');
    } finally {
      setLoading(false);
    }
  }, [inputs]);

  /**
   * Enhance prompt
   */
  const enhancePromptHandler = useCallback(async (customizations = {}, enhancements = []) => {
    if (!draftPrompt) {
      setError('Please generate a prompt first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiEnhancePrompt(draftPrompt, customizations, enhancements);
      if (!result.success) {
        setError(result.error || 'Failed to enhance prompt');
        setLoading(false);
        return;
      }

      setEnhancedPrompt(result.enhancedPrompt);
      setStats(result.stats);
      setSuccess('Prompt enhanced successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error enhancing prompt');
    } finally {
      setLoading(false);
    }
  }, [draftPrompt]);

  /**
   * Copy to clipboard
   */
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
      return true;
    } catch (err) {
      setError('Failed to copy to clipboard');
      return false;
    }
  }, []);

  /**
   * Export as JSON
   */
  const exportAsJSON = useCallback(() => {
    try {
      const data = {
        inputs,
        draftPrompt,
        enhancedPrompt,
        stats,
        timestamp: new Date().toISOString()
      };

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prompt-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess('Exported as JSON!');
      setTimeout(() => setSuccess(''), 3000);
      return true;
    } catch (err) {
      setError('Failed to export as JSON');
      return false;
    }
  }, [inputs, draftPrompt, enhancedPrompt, stats]);

  /**
   * Reset form
   */
  const resetForm = useCallback(() => {
    const defaultInputs = {
      age: '20-30',
      gender: 'female',
      style: 'elegant',
      colors: 'white and black',
      material: 'silk blend',
      setting: 'studio',
      mood: 'elegant'
    };
    setInputs(defaultInputs);
    setDraftPrompt('');
    setEnhancedPrompt('');
    setStats(null);
    setError('');
    setSuccess('');
    setValidationErrors([]);
    localStorage.setItem('promptBuilderInputs', JSON.stringify(defaultInputs));
  }, []);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
    setValidationErrors([]);
  }, []);

  // ============ RETURN ============

  return {
    // State
    inputs,
    draftPrompt,
    enhancedPrompt,
    stats,
    loading,
    error,
    success,
    validationErrors,

    // Handlers
    updateInput,
    generatePrompt,
    enhancePromptHandler,
    copyToClipboard,
    exportAsJSON,
    resetForm,
    clearMessages
  };
};

export default usePromptBuilder;
