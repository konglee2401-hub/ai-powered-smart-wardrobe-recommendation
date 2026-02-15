import express from 'express';
import AIModel from '../models/AIModel.js';
import * as modelSyncService from '../services/modelSyncService.js';

const router = express.Router();

// ==================== GET ALL MODELS ====================

router.get('/', async (req, res) => {
  try {
    const { type, provider, available } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (provider) query.provider = provider;
    if (available === 'true') query['status.available'] = true;
    
    const models = await AIModel.find(query).sort({ 'performance.priority': 1 });
    
    res.json({
      success: true,
      data: {
        models: models,
        total: models.length,
        byType: {
          analysis: models.filter(m => m.type === 'analysis').length,
          'image-generation': models.filter(m => m.type === 'image-generation').length,
          'video-generation': models.filter(m => m.type === 'video-generation').length
        },
        byProvider: models.reduce((acc, m) => {
          acc[m.provider] = (acc[m.provider] || 0) + 1;
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET MODEL BY ID ====================

router.get('/:modelId', async (req, res) => {
  try {
    const model = await AIModel.findOne({ modelId: req.params.modelId });
    
    if (!model) {
      return res.status(404).json({ success: false, message: 'Model not found' });
    }
    
    res.json({ success: true, data: model });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SYNC MODELS ====================

router.post('/sync', async (req, res) => {
  try {
    const { type } = req.body;
    
    console.log(`🔄 Manual sync requested for type: ${type || 'all'}`);
    
    await modelSyncService.syncModelsToDatabase(type);
    
    const models = await AIModel.find(type ? { type } : {});
    
    res.json({
      success: true,
      message: 'Models synced successfully',
      data: {
        total: models.length,
        byType: {
          analysis: models.filter(m => m.type === 'analysis').length,
          'image-generation': models.filter(m => m.type === 'image-generation').length,
          'video-generation': models.filter(m => m.type === 'video-generation').length
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET BEST PERFORMING MODELS ====================

router.get('/stats/best-performing', async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    const models = await AIModel.getBestPerformingModels(
      type || 'analysis',
      parseInt(limit) || 5
    );
    
    res.json({
      success: true,
      data: models.map(m => ({
        modelId: m.modelId,
        name: m.name,
        provider: m.provider,
        successRate: m.performance.successRate,
        avgResponseTime: m.performance.avgResponseTime,
        totalRequests: m.performance.totalRequests
      }))
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET MODEL STATISTICS ====================

router.get('/stats/overview', async (req, res) => {
  try {
    const allModels = await AIModel.find({});
    
    const stats = {
      total: allModels.length,
      available: allModels.filter(m => m.status.available).length,
      recommended: allModels.filter(m => m.status.recommended).length,
      free: allModels.filter(m => m.pricing.free).length,
      byType: {},
      byProvider: {},
      performance: {
        totalRequests: 0,
        successfulRequests: 0,
        avgSuccessRate: 0
      }
    };
    
    allModels.forEach(model => {
      // By type
      stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;
      
      // By provider
      stats.byProvider[model.provider] = (stats.byProvider[model.provider] || 0) + 1;
      
      // Performance
      stats.performance.totalRequests += model.performance.totalRequests;
      stats.performance.successfulRequests += model.performance.successfulRequests;
    });
    
    if (stats.performance.totalRequests > 0) {
      stats.performance.avgSuccessRate = 
        (stats.performance.successfulRequests / stats.performance.totalRequests) * 100;
    }
    
    res.json({ success: true, data: stats });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== UPDATE MODEL ====================

router.patch('/:modelId', async (req, res) => {
  try {
    const model = await AIModel.findOne({ modelId: req.params.modelId });
    
    if (!model) {
      return res.status(404).json({ success: false, message: 'Model not found' });
    }
    
    const updates = req.body;
    
    // Update allowed fields
    if (updates.status) Object.assign(model.status, updates.status);
    if (updates.performance) Object.assign(model.performance, updates.performance);
    if (updates.pricing) Object.assign(model.pricing, updates.pricing);
    
    await model.save();
    
    res.json({ success: true, data: model });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
