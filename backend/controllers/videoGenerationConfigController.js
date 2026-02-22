import VideoGenerationConfig from '../models/VideoGenerationConfig.js';
import { validateRequest, handleError } from '../middleware/errorHandler.js';

// Get all configs for a user
export const getAllConfigs = async (req, res) => {
  try {
    const configs = await VideoGenerationConfig.find({ userId: req.user.id });
    res.json({ success: true, configs });
  } catch (err) {
    handleError(res, err);
  }
};

// Create a new config
export const createConfig = async (req, res) => {
  try {
    validateRequest(req, ['configName']);
    
    const config = new VideoGenerationConfig({
      userId: req.user.id,
      configName: req.body.configName,
      automationFrequency: req.body.automationFrequency || 'hourly',
      lastExecutedAt: req.body.lastExecutedAt,
      nextExecutionTime: req.body.nextExecutionTime,
      isActive: req.body.isActive !== false,
      
      // Video Style
      videoStyle: {
        style: req.body.videoStyle?.style || 'dynamic',
        motionIntensity: req.body.videoStyle?.motionIntensity || 'medium',
        aspectRatio: req.body.videoStyle?.aspectRatio || '9:16',
        fps: req.body.videoStyle?.fps || 30,
        resolution: req.body.videoStyle?.resolution || '1080p'
      },
      
      // Audio
      audioSettings: {
        includeAudio: req.body.audioSettings?.includeAudio !== false,
        audioSource: req.body.audioSettings?.audioSource || 'generated',
        audioGenrePreference: req.body.audioSettings?.audioGenrePreference || 'upbeat'
      },
      
      // Content Generation
      contentGeneration: {
        contentType: req.body.contentGeneration?.contentType || 'motivational',
        characterImage: req.body.contentGeneration?.characterImage,
        moodSetting: req.body.contentGeneration?.moodSetting || 'energetic',
        useTextOverlay: req.body.contentGeneration?.useTextOverlay !== false,
        textPosition: req.body.contentGeneration?.textPosition || 'bottom'
      },
      
      // Distribution Settings
      distributionSettings: {
        enableAutoDistribution: req.body.distributionSettings?.enableAutoDistribution !== false,
        accountSelectionStrategy: req.body.distributionSettings?.accountSelectionStrategy || 'sequential',
        minAccountsToDistribute: req.body.distributionSettings?.minAccountsToDistribute || 1,
        enableRetryOnFailure: req.body.distributionSettings?.enableRetryOnFailure !== false,
        maxRetries: req.body.distributionSettings?.maxRetries || 3
      },
      
      // Platform-specific settings
      platformSettings: {
        tiktok: req.body.platformSettings?.tiktok || {},
        youtube: req.body.platformSettings?.youtube || {},
        facebook: req.body.platformSettings?.facebook || {},
        instagram: req.body.platformSettings?.instagram || {}
      },
      
      executionHistory: []
    });

    const savedConfig = await config.save();
    res.status(201).json({ 
      success: true, 
      message: 'Configuration created successfully',
      config: savedConfig 
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get a specific config
export const getConfig = async (req, res) => {
  try {
    const config = await VideoGenerationConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    
    res.json({ success: true, config });
  } catch (err) {
    handleError(res, err);
  }
};

// Update a config
export const updateConfig = async (req, res) => {
  try {
    const config = await VideoGenerationConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    
    res.json({ success: true, message: 'Configuration updated successfully', config });
  } catch (err) {
    handleError(res, err);
  }
};

// Delete a config
export const deleteConfig = async (req, res) => {
  try {
    await VideoGenerationConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Configuration deleted successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

// Check if config is due for execution
export const checkDueExecution = async (req, res) => {
  try {
    const config = await VideoGenerationConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    
    const isDue = config.isDueForExecution();
    
    res.json({ 
      success: true, 
      isDue,
      configName: config.configName,
      frequency: config.automationFrequency,
      lastExecuted: config.lastExecutedAt,
      nextExecution: config.nextExecutionTime
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Manually trigger execution
export const executeNow = async (req, res) => {
  try {
    const config = await VideoGenerationConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    
    config.lastExecutedAt = new Date();
    config.updateNextExecution();
    
    // Add to execution history
    config.executionHistory.push({
      executedAt: new Date(),
      status: 'initiated',
      generatedVideoId: null,
      distributionResults: []
    });
    
    await config.save();
    
    res.json({ 
      success: true, 
      message: 'Video generation triggered successfully',
      nextExecution: config.nextExecutionTime,
      config
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get execution history
export const getExecutionHistory = async (req, res) => {
  try {
    const config = await VideoGenerationConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    
    // Return last 20 executions
    const history = config.executionHistory.slice(-20).reverse();
    
    res.json({ 
      success: true, 
      configName: config.configName,
      totalExecutions: config.executionHistory.length,
      recentExecutions: history
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Toggle automation on/off
export const toggleAutomation = async (req, res) => {
  try {
    const config = await VideoGenerationConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    
    config.isActive = !config.isActive;
    await config.save();
    
    res.json({ 
      success: true, 
      message: `Automation ${config.isActive ? 'enabled' : 'disabled'}`,
      isActive: config.isActive,
      config
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get default settings
export const getDefaults = async (req, res) => {
  try {
    const defaults = {
      automationFrequencies: ['hourly', 'every2hours', 'every4hours', 'every6hours', 'every12hours', 'daily', 'custom'],
      videoStyles: ['dynamic', 'static', 'minimal', 'cinematic'],
      motionIntensities: ['low', 'medium', 'high'],
      aspectRatios: ['9:16', '16:9', '1:1'],
      contentTypes: ['motivational', 'educational', 'entertainment', 'news'],
      distributionStrategies: ['sequential', 'random', 'roundRobin', 'weighted'],
      platformSettings: {
        tiktok: { maxDuration: 600, minDuration: 15 },
        youtube: { maxDuration: 43200, minDuration: 60 },
        facebook: { maxDuration: 3600, minDuration: 10 },
        instagram: { maxDuration: 3600, minDuration: 3 }
      }
    };
    
    res.json({ success: true, defaults });
  } catch (err) {
    handleError(res, err);
  }
};
