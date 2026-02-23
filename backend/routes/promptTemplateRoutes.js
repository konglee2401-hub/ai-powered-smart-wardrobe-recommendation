import express from 'express';
import PromptTemplate from '../models/PromptTemplate.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================
// GET ENDPOINTS
// ============================================================

/**
 * GET /api/prompt-templates
 * Get all templates with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { useCase, isCore, page, step, isActive = true } = req.query;
    const filter = {};

    if (isActive !== 'false') filter.isActive = true;
    if (useCase) filter.useCase = useCase;
    if (isCore) filter.isCore = isCore === 'true';
    if (page) filter['usedInPages.page'] = page;
    if (step) filter['usedInPages.step'] = parseInt(step);

    const templates = await PromptTemplate.find(filter)
      .sort({ isCore: -1, createdAt: -1 });

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/prompt-templates/usecase/:useCase
 * Get templates for specific use case
 */
router.get('/usecase/:useCase', async (req, res) => {
  try {
    const templates = await PromptTemplate.findByUseCase(req.params.useCase);
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates by usecase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/prompt-templates/core
 * Get all core templates (non-deletable)
 */
router.get('/core', async (req, res) => {
  try {
    const templates = await PromptTemplate.findCoreTemplates();
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching core templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch core templates'
    });
  }
});

/**
 * GET /api/prompt-templates/page/:page
 * Get templates used in specific page
 */
router.get('/page/:page', async (req, res) => {
  try {
    const templates = await PromptTemplate.findByPage(req.params.page);
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates by page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/prompt-templates/page/:page/step/:step
 * Get templates for specific page and step
 */
router.get('/page/:page/step/:step', async (req, res) => {
  try {
    const templates = await PromptTemplate.findByPageAndStep(
      req.params.page,
      parseInt(req.params.step)
    );
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/prompt-templates/:id
 * Get single template by ID
 */
router.get('/:id', async (req, res) => {
  try {
    // Check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// ============================================================
// POST ENDPOINTS
// ============================================================

/**
 * POST /api/prompt-templates
 * Create new template
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      useCase,
      style,
      templateType,
      content,
      fields,
      usedInPages,
      isCore = false,
      tags = [],
      metadata = {}
    } = req.body;

    // Validation
    if (!name || !content?.mainPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Name and mainPrompt are required'
      });
    }

    const template = new PromptTemplate({
      name,
      description: description || '',
      useCase: useCase || 'generic',
      style: style || 'realistic',
      templateType: templateType || 'text',
      content,
      fields: fields || [],
      usedInPages: usedInPages || [],
      isCore,
      tags,
      metadata,
      createdBy: req.user?.id || 'api'
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

/**
 * POST /api/prompt-templates/:id/clone
 * Clone template with new name
 */
router.post('/:id/clone', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const originalTemplate = await PromptTemplate.findById(req.params.id);
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const { name: cloneName } = req.body;

    const clonedTemplate = new PromptTemplate({
      name: cloneName || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      useCase: originalTemplate.useCase,
      style: originalTemplate.style,
      templateType: originalTemplate.templateType,
      content: originalTemplate.content,
      fields: originalTemplate.fields,
      usedInPages: [],
      tags: originalTemplate.tags,
      metadata: originalTemplate.metadata,
      isCore: false,
      isClone: true,
      parentTemplateId: originalTemplate._id,
      version: 1,
      createdBy: req.user?.id || 'api'
    });

    await clonedTemplate.save();

    res.status(201).json({
      success: true,
      data: clonedTemplate,
      message: 'Template cloned successfully'
    });
  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clone template'
    });
  }
});

/**
 * POST /api/prompt-templates/:id/render
 * Render template with field values
 */
router.post('/:id/render', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const { fieldValues = {} } = req.body;
    const rendered = template.getRenderedPrompt(fieldValues);

    // Increment usage
    await template.incrementUsage();

    res.json({
      success: true,
      data: {
        ...rendered,
        templateId: template._id,
        templateName: template.name
      }
    });
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to render template'
    });
  }
});

/**
 * POST /api/prompt-templates/:id/usage
 * Track template usage
 */
router.post('/:id/usage', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    await template.incrementUsage();

    res.json({
      success: true,
      data: {
        usageCount: template.usageCount,
        lastUsed: template.lastUsed
      }
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track usage'
    });
  }
});

// ============================================================
// PUT ENDPOINTS
// ============================================================

/**
 * PUT /api/prompt-templates/:id
 * Update template
 */
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (template.isCore) {
      return res.status(403).json({
        success: false,
        error: 'Cannot edit core templates directly. Clone and customize instead.'
      });
    }

    // Update fields
    const allowedUpdates = [
      'name',
      'description',
      'useCase',
      'style',
      'templateType',
      'content',
      'fields',
      'usedInPages',
      'tags',
      'metadata',
      'isActive'
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        template[key] = req.body[key];
      }
    });

    template.version = (template.version || 1) + 1;
    await template.save();

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

/**
 * PUT /api/prompt-templates/:id/usage-location
 * Update where template is being used
 */
router.put('/:id/usage-location', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const { page, step, context, field, action = 'add' } = req.body;

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'page is required'
      });
    }

    let template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const usageLocation = { page, step, context, field };

    if (action === 'add') {
      // Check if already exists
      const exists = template.usedInPages.some(
        loc => loc.page === page && loc.step === step && loc.context === context
      );
      if (!exists) {
        template.usedInPages.push(usageLocation);
      }
    } else if (action === 'remove') {
      template.usedInPages = template.usedInPages.filter(
        loc => !(loc.page === page && loc.step === step && loc.context === context)
      );
    }

    template = await template.save();

    res.json({
      success: true,
      data: template,
      message: 'Usage location updated successfully'
    });
  } catch (error) {
    console.error('Error updating usage location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update usage location'
    });
  }
});

// ============================================================
// DELETE ENDPOINTS
// ============================================================

/**
 * DELETE /api/prompt-templates/:id
 * Delete template (only if not core)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const template = await PromptTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (!template.canDelete()) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete core templates'
      });
    }

    await PromptTemplate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

export default router;
