import Option from '../models/Option.js';
import { extractOptions } from '../services/analysisParser.js';

/**
 * Get all options grouped by category
 */
export async function getAllOptions(req, res) {
  try {
    const options = await Option.getAllGrouped();
    
    res.json({
      success: true,
      options
    });
    
  } catch (error) {
    console.error('Error getting options:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Get options by category
 */
export async function getOptionsByCategory(req, res) {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const options = await Option.getPopular(category, limit);
    
    res.json({
      success: true,
      category,
      options: options.map(opt => ({
        value: opt.value,
        count: opt.count,
        lastUsed: opt.lastUsed
      }))
    });
    
  } catch (error) {
    console.error('Error getting category options:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Add new option manually
 */
export async function addOption(req, res) {
  try {
    const { category, value } = req.body;
    
    if (!category || !value) {
      return res.status(400).json({
        error: 'Category and value are required'
      });
    }
    
    const option = await Option.addOrIncrement(category, value);
    
    res.json({
      success: true,
      option: {
        category: option.category,
        value: option.value,
        count: option.count
      }
    });
    
  } catch (error) {
    console.error('Error adding option:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Save extracted options from analysis
 */
export async function saveExtractedOptions(req, res) {
  try {
    const { parsedAnalysis } = req.body;
    
    if (!parsedAnalysis) {
      return res.status(400).json({
        error: 'Parsed analysis is required'
      });
    }
    
    // Extract options
    const extractedOptions = extractOptions(parsedAnalysis);
    
    // Save to database
    const saved = {
      scenes: [],
      moods: [],
      styles: [],
      clothingTypes: [],
      colors: [],
      patterns: [],
      accessories: [],
      occasions: []
    };
    
    for (const [category, values] of Object.entries(extractedOptions)) {
      const categoryName = category.slice(0, -1); // Remove 's' (scenes -> scene)
      
      for (const value of values) {
        const option = await Option.addOrIncrement(categoryName, value);
        saved[category].push({
          value: option.value,
          count: option.count,
          isNew: option.count === 1
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Options saved successfully',
      saved
    });
    
  } catch (error) {
    console.error('Error saving extracted options:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Delete option
 */
export async function deleteOption(req, res) {
  try {
    const { category, value } = req.params;
    
    await Option.deleteOne({ category, value });
    
    res.json({
      success: true,
      message: 'Option deleted'
    });
    
  } catch (error) {
    console.error('Error deleting option:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

export default {
  getAllOptions,
  getOptionsByCategory,
  addOption,
  saveExtractedOptions,
  deleteOption
};
