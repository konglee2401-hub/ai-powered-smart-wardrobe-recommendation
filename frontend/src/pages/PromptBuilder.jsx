/**
 * Smart Fashion Prompt Builder - React Component
 * Phase 2: Revised with all fixes
 * 
 * Features:
 * 1. Fully Controlled Form Components
 * 2. Real-time Prompt Generation
 * 3. Local Storage Persistence
 * 4. Error Handling & Loading States
 * 5. Copy to Clipboard Functionality
 */

import React, { useState, useEffect } from 'react';
import {
  generateDynamicPrompt,
  validateInputs,
  getPromptStats,
  customizePrompt
} from '../utils/promptTemplates';

const PromptBuilder = () => {
  // ============ STATE MANAGEMENT ============

  const [formInputs, setFormInputs] = useState({
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [promptStats, setPromptStats] = useState(null);
  const [customizations, setCustomizations] = useState({});
  const [showCustomize, setShowCustomize] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // ============ OPTIONS ============

  const ageOptions = ['18-25', '25-30', '30-40', '40-50', '50+'];
  const genderOptions = ['male', 'female', 'non-binary'];
  const styleOptions = [
    'casual',
    'formal',
    'elegant',
    'sporty',
    'vintage',
    'luxury',
    'bohemian',
    'minimalist',
    'edgy'
  ];
  const colorOptions = [
    'vibrant',
    'monochrome',
    'pastel',
    'jewel tones',
    'earth tones',
    'white and black'
  ];
  const materialOptions = [
    'silk blend',
    'cotton',
    'wool',
    'leather',
    'linen',
    'polyester'
  ];
  const settingOptions = [
    'studio',
    'beach',
    'office',
    'urban',
    'gym',
    'nature'
  ];
  const moodOptions = [
    'playful',
    'serious',
    'romantic',
    'energetic',
    'calm',
    'elegant'
  ];

  // ============ EFFECTS ============

  // Load from localStorage on mount
  useEffect(() => {
    const savedInputs = localStorage.getItem('promptBuilderInputs');
    if (savedInputs) {
      try {
        setFormInputs(JSON.parse(savedInputs));
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }
    }
  }, []);

  // Generate prompt whenever inputs change
  useEffect(() => {
    generatePrompt();
  }, [formInputs]);

  // ============ HANDLERS ============

  /**
   * Handle input change for form fields
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedInputs = {
      ...formInputs,
      [name]: value
    };
    setFormInputs(updatedInputs);

    // Save to localStorage
    localStorage.setItem('promptBuilderInputs', JSON.stringify(updatedInputs));

    // Clear error message
    setError('');
  };

  /**
   * Generate dynamic prompt from inputs
   */
  const generatePrompt = () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate inputs
      const validation = validateInputs(formInputs);
      if (!validation.isValid) {
        setError(`Validation errors: ${validation.errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Generate prompt
      const prompt = generateDynamicPrompt(formInputs);
      setDraftPrompt(prompt);

      // Calculate statistics
      const stats = getPromptStats(prompt);
      setPromptStats(stats);

      // Reset enhanced prompt and customizations
      setEnhancedPrompt('');
      setCustomizations({});
      setShowCustomize(false);

      setSuccess('Prompt generated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error generating prompt');
      setDraftPrompt('');
      setPromptStats(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enhance the prompt with customizations
   */
  const enhancePromptHandler = () => {
    if (!draftPrompt) {
      setError('Please generate a prompt first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let enhanced = draftPrompt;

      // Apply customizations
      if (Object.keys(customizations).length > 0) {
        enhanced = customizePrompt(enhanced, customizations);
      }

      // Add quality enhancements
      enhanced += ' Ultra high resolution, professional studio lighting, perfect composition, fashion editorial style.';

      setEnhancedPrompt(enhanced);
      setSuccess('Prompt enhanced successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error enhancing prompt: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle customization input change
   */
  const handleCustomizationChange = (e) => {
    const { name, value } = e.target;
    setCustomizations({
      ...customizations,
      [name]: value
    });
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(''), 2000);
    }).catch(err => {
      setError('Failed to copy to clipboard: ' + err.message);
    });
  };

  /**
   * Reset form to defaults
   */
  const resetForm = () => {
    const defaultInputs = {
      age: '20-30',
      gender: 'female',
      style: 'elegant',
      colors: 'white and black',
      material: 'silk blend',
      setting: 'studio',
      mood: 'elegant'
    };
    setFormInputs(defaultInputs);
    setDraftPrompt('');
    setEnhancedPrompt('');
    setCustomizations({});
    setShowCustomize(false);
    setError('');
    setSuccess('');
    setPromptStats(null);
    localStorage.setItem('promptBuilderInputs', JSON.stringify(defaultInputs));
  };

  /**
   * Export prompt as JSON
   */
  const exportAsJSON = () => {
    const data = {
      inputs: formInputs,
      draftPrompt,
      enhancedPrompt,
      customizations,
      stats: promptStats,
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

    setSuccess('Prompt exported as JSON!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ============ STYLES ============

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px',
      color: '#333'
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '16px',
      color: '#666'
    },
    mainContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '20px'
    },
    formSection: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    promptSection: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#333',
      borderBottom: '2px solid #007bff',
      paddingBottom: '10px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#333',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'border-color 0.3s'
    },
    selectFocus: {
      borderColor: '#007bff',
      outline: 'none'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
      flexWrap: 'wrap'
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'all 0.3s'
    },
    primaryButton: {
      backgroundColor: '#007bff',
      color: 'white',
      flex: 1,
      minWidth: '120px'
    },
    primaryButtonHover: {
      backgroundColor: '#0056b3'
    },
    secondaryButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      flex: 1,
      minWidth: '120px'
    },
    secondaryButtonHover: {
      backgroundColor: '#545b62'
    },
    successButton: {
      backgroundColor: '#28a745',
      color: 'white',
      flex: 1,
      minWidth: '120px'
    },
    successButtonHover: {
      backgroundColor: '#218838'
    },
    dangerButton: {
      backgroundColor: '#dc3545',
      color: 'white',
      flex: 1,
      minWidth: '120px'
    },
    dangerButtonHover: {
      backgroundColor: '#c82333'
    },
    promptBox: {
      backgroundColor: '#f9f9f9',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '15px',
      marginBottom: '15px',
      minHeight: '100px',
      lineHeight: '1.6',
      fontSize: '14px',
      color: '#333',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      flex: 1
    },
    emptyPrompt: {
      color: '#999',
      fontStyle: 'italic'
    },
    statsBox: {
      backgroundColor: '#e7f3ff',
      border: '1px solid #b3d9ff',
      borderRadius: '4px',
      padding: '10px 15px',
      marginBottom: '15px',
      fontSize: '13px',
      color: '#004085'
    },
    alert: {
      padding: '12px 15px',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '14px'
    },
    errorAlert: {
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      color: '#721c24'
    },
    successAlert: {
      backgroundColor: '#d4edda',
      border: '1px solid #c3e6cb',
      color: '#155724'
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #007bff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    customizeSection: {
      backgroundColor: '#f9f9f9',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '15px',
      marginTop: '15px'
    },
    customizeTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#333'
    },
    customizeInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '13px',
      marginBottom: '10px',
      fontFamily: 'monospace'
    },
    copyButton: {
      position: 'relative',
      padding: '8px 15px',
      backgroundColor: '#17a2b8',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      transition: 'all 0.3s'
    },
    copyButtonCopied: {
      backgroundColor: '#28a745'
    }
  };

  // ============ RENDER ============

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎨 Smart Fashion Prompt Builder</h1>
        <p style={styles.subtitle}>Generate professional fashion photography prompts in seconds</p>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ ...styles.alert, ...styles.errorAlert }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{ ...styles.alert, ...styles.successAlert }}>
          ✅ {success}
        </div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Form Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>📋 Fashion Parameters</h2>

          {/* Age */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Age Range</label>
            <select
              name="age"
              value={formInputs.age}
              onChange={handleInputChange}
              style={styles.select}
            >
              {ageOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Gender</label>
            <select
              name="gender"
              value={formInputs.gender}
              onChange={handleInputChange}
              style={styles.select}
            >
              {genderOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Fashion Style</label>
            <select
              name="style"
              value={formInputs.style}
              onChange={handleInputChange}
              style={styles.select}
            >
              {styleOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Colors */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Color Scheme</label>
            <select
              name="colors"
              value={formInputs.colors}
              onChange={handleInputChange}
              style={styles.select}
            >
              {colorOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Material */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Fabric Material</label>
            <select
              name="material"
              value={formInputs.material}
              onChange={handleInputChange}
              style={styles.select}
            >
              {materialOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Setting */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Photography Setting</label>
            <select
              name="setting"
              value={formInputs.setting}
              onChange={handleInputChange}
              style={styles.select}
            >
              {settingOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Mood */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Mood/Atmosphere</label>
            <select
              name="mood"
              value={formInputs.mood}
              onChange={handleInputChange}
              style={styles.select}
            >
              {moodOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={styles.buttonGroup}>
            <button
              onClick={generatePrompt}
              disabled={loading}
              style={{
                ...styles.button,
                ...styles.primaryButton
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#0056b3'}
              onMouseLeave={e => e.target.style.backgroundColor = '#007bff'}
            >
              {loading ? '⏳ Generating...' : '✨ Generate Prompt'}
            </button>
            <button
              onClick={resetForm}
              style={{
                ...styles.button,
                ...styles.dangerButton
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#c82333'}
              onMouseLeave={e => e.target.style.backgroundColor = '#dc3545'}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Prompt Section */}
        <div style={styles.promptSection}>
          <h2 style={styles.sectionTitle}>📝 Generated Prompt</h2>

          {/* Stats */}
          {promptStats && (
            <div style={styles.statsBox}>
              📊 <strong>Stats:</strong> {promptStats.characters} chars | {promptStats.words} words | {promptStats.sentences} sentences
            </div>
          )}

          {/* Draft Prompt */}
          <div>
            <label style={styles.label}>Draft Prompt</label>
            <div
              style={{
                ...styles.promptBox,
                ...(draftPrompt ? {} : styles.emptyPrompt)
              }}
            >
              {draftPrompt || 'Your prompt will appear here...'}
            </div>
            {draftPrompt && (
              <button
                onClick={() => copyToClipboard(draftPrompt, 'draft')}
                style={{
                  ...styles.copyButton,
                  ...(copiedText === 'draft' ? styles.copyButtonCopied : {})
                }}
              >
                {copiedText === 'draft' ? '✅ Copied!' : '📋 Copy Draft'}
              </button>
            )}
          </div>

          {/* Customize Section */}
          {draftPrompt && (
            <div style={styles.customizeSection}>
              <div style={styles.customizeTitle}>
                ✏️ Customize Prompt
                <button
                  onClick={() => setShowCustomize(!showCustomize)}
                  style={{
                    marginLeft: '10px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  {showCustomize ? '▼ Hide' : '▶ Show'}
                </button>
              </div>

              {showCustomize && (
                <div>
                  <input
                    type="text"
                    placeholder="Word to replace (e.g., 'silk')"
                    style={styles.customizeInput}
                    onChange={(e) => {
                      const key = e.target.value;
                      if (key) {
                        const value = document.getElementById('replaceWith')?.value || '';
                        setCustomizations({ ...customizations, [key]: value });
                      }
                    }}
                  />
                  <input
                    id="replaceWith"
                    type="text"
                    placeholder="Replace with (e.g., 'cotton')"
                    style={styles.customizeInput}
                  />
                  <button
                    onClick={enhancePromptHandler}
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...styles.successButton
                    }}
                    onMouseEnter={e => e.target.style.backgroundColor = '#218838'}
                    onMouseLeave={e => e.target.style.backgroundColor = '#28a745'}
                  >
                    {loading ? '⏳ Enhancing...' : '🚀 Enhance Prompt'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Prompt */}
          {enhancedPrompt && (
            <div style={{ marginTop: '15px' }}>
              <label style={styles.label}>Enhanced Prompt</label>
              <div style={styles.promptBox}>
                {enhancedPrompt}
              </div>
              <button
                onClick={() => copyToClipboard(enhancedPrompt, 'enhanced')}
                style={{
                  ...styles.copyButton,
                  ...(copiedText === 'enhanced' ? styles.copyButtonCopied : {})
                }}
              >
                {copiedText === 'enhanced' ? '✅ Copied!' : '📋 Copy Enhanced'}
              </button>
            </div>
          )}

          {/* Export Button */}
          {draftPrompt && (
            <button
              onClick={exportAsJSON}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                marginTop: '15px'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#545b62'}
              onMouseLeave={e => e.target.style.backgroundColor = '#6c757d'}
            >
              💾 Export as JSON
            </button>
          )}
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        select:focus, input:focus {
          border-color: #007bff;
          outline: none;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PromptBuilder;
