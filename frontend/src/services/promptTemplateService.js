/**
 * Prompt Template Service - ENHANCED
 * Comprehensive template management with advanced features
 */

import { api } from './api';

const BASE_URL = '/prompt-templates';

// ============================================================
// GET ENDPOINTS
// ============================================================

/**
 * Get all templates with optional filtering
 */
export async function getAllTemplates(filters = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

/**
 * Get templates for specific use case
 */
export async function getTemplatesByUseCase(useCase) {
  try {
    const response = await api.get(`${BASE_URL}/usecase/${useCase}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching templates for ${useCase}:`, error);
    throw error;
  }
}

/**
 * Get core templates
 */
export async function getCoreTemplates() {
  try {
    const response = await api.get(`${BASE_URL}/core`);
    return response.data;
  } catch (error) {
    console.error('Error fetching core templates:', error);
    throw error;
  }
}

/**
 * Get templates used in specific page
 */
export async function getTemplatesByPage(page) {
  try {
    const response = await api.get(`${BASE_URL}/page/${page}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching templates for page ${page}:`, error);
    throw error;
  }
}

/**
 * Get templates for specific page and step
 */
export async function getTemplatesByPageStep(page, step) {
  try {
    const response = await api.get(`${BASE_URL}/page/${page}/step/${step}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching templates for ${page} step ${step}:`, error);
    throw error;
  }
}

/**
 * Get single template by ID
 */
export async function getTemplateById(id) {
  try {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching template ${id}:`, error);
    throw error;
  }
}

/**
 * Get all templates (for backward compatibility)
 */
export async function getPromptTemplates(filters = {}) {
  return getAllTemplates(filters);
}

/**
 * Get template by ID (for backward compatibility)
 */
export async function getPromptTemplateById(id) {
  return getTemplateById(id);
}

// ============================================================
// POST ENDPOINTS
// ============================================================

/**
 * Create new template
 */
export async function createTemplate(templateData) {
  try {
    const response = await api.post(BASE_URL, templateData);
    return response.data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

/**
 * Create template (for backward compatibility)
 */
export async function createPromptTemplate(templateData) {
  return createTemplate(templateData);
}

/**
 * Clone template
 */
export async function cloneTemplate(id, name) {
  try {
    const response = await api.post(`${BASE_URL}/${id}/clone`, { name });
    return response.data;
  } catch (error) {
    console.error(`Error cloning template ${id}:`, error);
    throw error;
  }
}

/**
 * Render template with field values
 */
export async function renderTemplate(id, fieldValues = {}) {
  try {
    const response = await api.post(`${BASE_URL}/${id}/render`, {
      fieldValues
    });
    return response.data;
  } catch (error) {
    console.error(`Error rendering template ${id}:`, error);
    throw error;
  }
}

/**
 * Track template usage
 */
export async function trackTemplateUsage(id) {
  try {
    const response = await api.post(`${BASE_URL}/${id}/usage`);
    return response.data;
  } catch (error) {
    console.error(`Error tracking usage for template ${id}:`, error);
    throw error;
  }
}

// ============================================================
// PUT ENDPOINTS
// ============================================================

/**
 * Update template
 */
export async function updateTemplate(id, templateData) {
  try {
    const response = await api.put(`${BASE_URL}/${id}`, templateData);
    return response.data;
  } catch (error) {
    console.error(`Error updating template ${id}:`, error);
    throw error;
  }
}

/**
 * Update template (for backward compatibility)
 */
export async function updatePromptTemplate(id, templateData) {
  return updateTemplate(id, templateData);
}

/**
 * Update template usage location
 */
export async function updateUsageLocation(id, { page, step, context, field, action }) {
  try {
    const response = await api.put(`${BASE_URL}/${id}/usage-location`, {
      page,
      step,
      context,
      field,
      action
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating usage location for template ${id}:`, error);
    throw error;
  }
}

// ============================================================
// DELETE ENDPOINTS
// ============================================================

/**
 * Delete template
 */
export async function deleteTemplate(id) {
  try {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting template ${id}:`, error);
    throw error;
  }
}

/**
 * Delete template (for backward compatibility)
 */
export async function deletePromptTemplate(id) {
  return deleteTemplate(id);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get template categories
 */
export async function getTemplateCategories() {
  try {
    const templates = await getAllTemplates();
    const categories = new Set();
    templates.data?.forEach(t => {
      if (t.useCase) categories.add(t.useCase);
    });
    return Array.from(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

/**
 * Search templates by keyword
 */
export async function searchPromptTemplates(keyword) {
  try {
    const allTemplates = await getAllTemplates();
    const filtered = (allTemplates.data || []).filter(t =>
      t.name?.toLowerCase().includes(keyword?.toLowerCase()) ||
      t.description?.toLowerCase().includes(keyword?.toLowerCase()) ||
      t.tags?.some(tag => tag?.toLowerCase().includes(keyword?.toLowerCase()))
    );
    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error searching templates:', error);
    throw error;
  }
}

/**
 * Get templates by category (for backward compatibility)
 */
export async function getTemplatesByCategory(category) {
  try {
    return await getTemplatesByUseCase(category);
  } catch (error) {
    console.error('Error getting templates by category:', error);
    throw error;
  }
}

// ============================================================
// EXPORT/IMPORT
// ============================================================

/**
 * Export templates to JSON
 */
export async function exportTemplates(ids = []) {
  try {
    let templates;

    if (ids.length > 0) {
      const results = await Promise.all(ids.map(id => getTemplateById(id)));
      templates = results.map(r => r.data);
    } else {
      const result = await getAllTemplates({ isActive: true });
      templates = result.data || [];
    }

    return {
      success: true,
      data: templates,
      exportDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting templates:', error);
    throw error;
  }
}

/**
 * Import templates from JSON
 */
export async function importTemplates(templates) {
  try {
    const results = await Promise.allSettled(templates.map(t => createTemplate(t)));

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      message: `Import successful: ${successful}. Failed: ${failed}.`,
      results: {
        successful,
        failed
      }
    };
  } catch (error) {
    console.error('Error importing templates:', error);
    throw error;
  }
}

// ============================================================
// DEFAULT EXPORT OBJECT
// ============================================================

export default {
  // Get
  getAllTemplates,
  getTemplatesByUseCase,
  getCoreTemplates,
  getTemplatesByPage,
  getTemplatesByPageStep,
  getTemplateById,
  getPromptTemplates,
  getPromptTemplateById,
  // Create
  createTemplate,
  createPromptTemplate,
  cloneTemplate,
  renderTemplate,
  trackTemplateUsage,
  // Update
  updateTemplate,
  updatePromptTemplate,
  updateUsageLocation,
  // Delete
  deleteTemplate,
  deletePromptTemplate,
  // Helpers
  getTemplateCategories,
  searchPromptTemplates,
  getTemplatesByCategory,
  exportTemplates,
  importTemplates
};
