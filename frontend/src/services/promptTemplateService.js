/**
 * Prompt Template Service - ENHANCED
 * Comprehensive template management with advanced features
 */

import { api } from './api';

const BASE_URL = '/prompt-templates';

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
    return await api.get(url);
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

export async function getTemplateMetadata() {
  try {
    return await api.get(`${BASE_URL}/metadata`);
  } catch (error) {
    console.error('Error fetching prompt template metadata:', error);
    throw error;
  }
}

export async function getTemplatesByUseCase(useCase) {
  try {
    return await api.get(`${BASE_URL}/usecase/${useCase}`);
  } catch (error) {
    console.error(`Error fetching templates for ${useCase}:`, error);
    throw error;
  }
}

export async function getCoreTemplates() {
  try {
    return await api.get(`${BASE_URL}/core`);
  } catch (error) {
    console.error('Error fetching core templates:', error);
    throw error;
  }
}

export async function getTemplatesByPage(page) {
  try {
    return await api.get(`${BASE_URL}/page/${page}`);
  } catch (error) {
    console.error(`Error fetching templates for page ${page}:`, error);
    throw error;
  }
}

export async function getTemplatesByPageStep(page, step) {
  try {
    return await api.get(`${BASE_URL}/page/${page}/step/${step}`);
  } catch (error) {
    console.error(`Error fetching templates for ${page} step ${step}:`, error);
    throw error;
  }
}

export async function getTemplateById(id) {
  try {
    return await api.get(`${BASE_URL}/${id}`);
  } catch (error) {
    console.error(`Error fetching template ${id}:`, error);
    throw error;
  }
}

export async function resolveAssignedTemplate(criteria = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    return await api.get(`${BASE_URL}/resolve${queryString ? `?${queryString}` : ''}`);
  } catch (error) {
    console.error('Error resolving assigned template:', error);
    throw error;
  }
}

export async function getPromptTemplates(filters = {}) {
  return getAllTemplates(filters);
}

export async function getPromptTemplateById(id) {
  return getTemplateById(id);
}

export async function createTemplate(templateData) {
  try {
    return await api.post(BASE_URL, templateData);
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

export async function createPromptTemplate(templateData) {
  return createTemplate(templateData);
}

export async function cloneTemplate(id, name) {
  try {
    return await api.post(`${BASE_URL}/${id}/clone`, { name });
  } catch (error) {
    console.error(`Error cloning template ${id}:`, error);
    throw error;
  }
}

export async function renderTemplate(id, fieldValues = {}) {
  try {
    return await api.post(`${BASE_URL}/${id}/render`, { fieldValues });
  } catch (error) {
    console.error(`Error rendering template ${id}:`, error);
    throw error;
  }
}

export async function resolveTemplate(criteria = {}, inputValues = {}, runtimeValues = {}) {
  try {
    return await api.post(`${BASE_URL}/resolve`, {
      criteria,
      inputValues,
      runtimeValues
    });
  } catch (error) {
    console.error('Error resolving prompt template:', error);
    throw error;
  }
}

export async function trackTemplateUsage(id) {
  try {
    return await api.post(`${BASE_URL}/${id}/usage`);
  } catch (error) {
    console.error(`Error tracking usage for template ${id}:`, error);
    throw error;
  }
}

export async function updateTemplate(id, templateData) {
  try {
    return await api.put(`${BASE_URL}/${id}`, templateData);
  } catch (error) {
    console.error(`Error updating template ${id}:`, error);
    throw error;
  }
}

export async function updatePromptTemplate(id, templateData) {
  return updateTemplate(id, templateData);
}

export async function updateUsageLocation(id, { page, step, context, field, action }) {
  try {
    return await api.put(`${BASE_URL}/${id}/usage-location`, {
      page,
      step,
      context,
      field,
      action
    });
  } catch (error) {
    console.error(`Error updating usage location for template ${id}:`, error);
    throw error;
  }
}

export async function assignTemplate(id, targets = []) {
  try {
    return await api.post(`${BASE_URL}/${id}/assign`, { targets });
  } catch (error) {
    console.error(`Error assigning template ${id}:`, error);
    throw error;
  }
}

export async function unassignTemplate(id, targets = []) {
  try {
    return await api.post(`${BASE_URL}/${id}/unassign`, { targets });
  } catch (error) {
    console.error(`Error unassigning template ${id}:`, error);
    throw error;
  }
}

export async function deleteTemplate(id) {
  try {
    return await api.delete(`${BASE_URL}/${id}`);
  } catch (error) {
    console.error(`Error deleting template ${id}:`, error);
    throw error;
  }
}

export async function deletePromptTemplate(id) {
  return deleteTemplate(id);
}

export async function scanHardcodedPrompts() {
  try {
    return await api.get(`${BASE_URL}/hardcoded/scan`);
  } catch (error) {
    console.error('Error scanning hardcoded prompts:', error);
    throw error;
  }
}

export async function syncHardcodedPrompts() {
  try {
    return await api.post(`${BASE_URL}/hardcoded/sync`);
  } catch (error) {
    console.error('Error syncing hardcoded prompts:', error);
    throw error;
  }
}

export async function getTemplateCategories() {
  try {
    const templates = await getAllTemplates();
    const categories = new Set();
    templates.data?.forEach((template) => {
      if (template.useCase) categories.add(template.useCase);
    });
    return Array.from(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

export async function searchPromptTemplates(keyword) {
  try {
    const allTemplates = await getAllTemplates();
    const filtered = (allTemplates.data || []).filter((template) =>
      template.name?.toLowerCase().includes(keyword?.toLowerCase()) ||
      template.description?.toLowerCase().includes(keyword?.toLowerCase()) ||
      template.tags?.some((tag) => tag?.toLowerCase().includes(keyword?.toLowerCase()))
    );
    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error searching templates:', error);
    throw error;
  }
}

export async function getTemplatesByCategory(category) {
  try {
    return await getTemplatesByUseCase(category);
  } catch (error) {
    console.error('Error getting templates by category:', error);
    throw error;
  }
}

export async function exportTemplates(ids = []) {
  try {
    let templates;

    if (ids.length > 0) {
      const results = await Promise.all(ids.map((id) => getTemplateById(id)));
      templates = results.map((result) => result.data);
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

export async function importTemplates(templates) {
  try {
    const results = await Promise.allSettled(templates.map((template) => createTemplate(template)));

    const successful = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.filter((result) => result.status === 'rejected').length;

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

export default {
  getAllTemplates,
  getTemplateMetadata,
  getTemplatesByUseCase,
  getCoreTemplates,
  getTemplatesByPage,
  getTemplatesByPageStep,
  getTemplateById,
  resolveAssignedTemplate,
  getPromptTemplates,
  getPromptTemplateById,
  createTemplate,
  createPromptTemplate,
  cloneTemplate,
  renderTemplate,
  resolveTemplate,
  trackTemplateUsage,
  updateTemplate,
  updatePromptTemplate,
  updateUsageLocation,
  assignTemplate,
  unassignTemplate,
  deleteTemplate,
  deletePromptTemplate,
  scanHardcodedPrompts,
  syncHardcodedPrompts,
  getTemplateCategories,
  searchPromptTemplates,
  getTemplatesByCategory,
  exportTemplates,
  importTemplates
};
