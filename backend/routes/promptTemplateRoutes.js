import express from 'express';
import PromptTemplate from '../models/PromptTemplate.js';

const router = express.Router();

// GET /api/prompt-templates - Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await PromptTemplate.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// GET /api/prompt-templates/:id - Get single template
router.get('/:id', async (req, res) => {
  try {
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

// POST /api/prompt-templates - Create new template
router.post('/', async (req, res) => {
  try {
    const { name, description, useCase, style, defaultPrompt, defaultNegativePrompt } = req.body;

    // Validation
    if (!name || !defaultPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Name and defaultPrompt are required'
      });
    }

    const template = new PromptTemplate({
      name,
      description: description || '',
      useCase: useCase || 'ecommerce',
      style: style || 'realistic',
      defaultPrompt,
      defaultNegativePrompt: defaultNegativePrompt || ''
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// PUT /api/prompt-templates/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { name, description, useCase, style, defaultPrompt, defaultNegativePrompt } = req.body;

    const template = await PromptTemplate.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        useCase,
        style,
        defaultPrompt,
        defaultNegativePrompt
      },
      { new: true, runValidators: true }
    );

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
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// DELETE /api/prompt-templates/:id - Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await PromptTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

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
