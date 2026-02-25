import express from 'express';
import PromptOption from '../models/PromptOption.js';

const router = express.Router();

// ==================== GET ALL OPTIONS ====================

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = {};
    if (category) {
      query.category = category;
    }
    
    const options = await PromptOption.find(query).sort({ category: 1, usageCount: -1, label: 1 });
    
    // 💫 Return flat array for compatibility with getAllOptions API
    const formattedOptions = options.map(option => ({
      id: option._id,
      category: option.category,
      value: option.value,
      label: option.label,
      description: option.description,
      isAiGenerated: option.isAiGenerated || false,
      usageCount: option.usageCount || 0
    }));
    
    res.json({
      success: true,
      data: formattedOptions,
      total: options.length
    });
    
  } catch (error) {
    console.error('❌ Error loading prompt options:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      data: []  // Return empty array as fallback
    });
  }
});

// ==================== GET BY CATEGORY ====================

router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const options = await PromptOption.getByCategory(category);
    
    res.json({
      success: true,
      data: {
        category,
        options: options.map(opt => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
          isAiGenerated: opt.isAiGenerated,
          usageCount: opt.usageCount
        })),
        total: options.length
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADD NEW OPTION ====================

router.post('/', async (req, res) => {
  try {
    const { category, value, label, description, metadata } = req.body;
    
    if (!category || !value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, value, label'
      });
    }
    
    const option = await PromptOption.addOrUpdate(category, value, label, {
      ...metadata,
      source: 'user-created',
      addedBy: 'user'
    });
    
    res.json({
      success: true,
      data: option
    });
    
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Option already exists'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== INCREMENT USAGE ====================

router.post('/:category/:value/use', async (req, res) => {
  try {
    const { category, value } = req.params;
    
    const option = await PromptOption.findOne({ category, value });
    
    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Option not found'
      });
    }
    
    await option.incrementUsage();
    
    res.json({
      success: true,
      data: {
        category,
        value,
        usageCount: option.usageCount
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FIND OR CREATE FROM AI ====================

router.post('/ai-extract', async (req, res) => {
  try {
    const { category, text } = req.body;
    
    if (!category || !text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, text'
      });
    }
    
    const option = await PromptOption.findOrCreate(category, text);
    
    res.json({
      success: true,
      data: option,
      created: option.isNew
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
