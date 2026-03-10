
import express from 'express';
import AIProvider from '../models/AIProvider.js';
import AIModel from '../models/AIModel.js';
// Correct import: use the main service logic, not the simplified script
import { syncModelsWithDB } from '../services/modelSyncService.js';
import { getKeyManager } from '../utils/keyManager.js';

// ============================================
// AI PROVIDER & MODEL MANAGEMENT CONTROLLER
// ============================================

/**
 * List all providers with their models
 * Keys now loaded from database instead of environment variables
 */
export async function getProvidersWithModels(req, res) {
  try {
    const providers = await AIProvider.find().sort({ priority: 1, name: 1 });
    const models = await AIModel.find().sort({ 'status.performanceScore': -1 });

    const modelsByProvider = {};
    models.forEach(model => {
      const providerId = model.provider?.toLowerCase() || 'unknown';
      if (!modelsByProvider[providerId]) {
        modelsByProvider[providerId] = [];
      }
      modelsByProvider[providerId].push(model);
    });

    // Merge data with keys from database
    const providerList = providers.map(p => {
      const apiKeysCount = p.apiKeys ? p.apiKeys.length : 0;

      return {
        _id: p._id,
        providerId: p.providerId,
        name: p.name,
        priority: p.priority,
        isEnabled: p.isEnabled,
        capabilities: p.capabilities,
        apiKeysCount: apiKeysCount,
        apiKeys: p.apiKeys ? p.apiKeys.map(k => ({
          _id: k._id,
          label: k.label,
          status: k.status,
          lastUsed: k.lastUsed,
          key: '********' // Mask keys for security
        })) : [],
        settings: p.settings,
        models: modelsByProvider[p.providerId] || []
      };
    });

    res.json({ success: true, data: providerList });
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update provider settings (priority, enabled state)
 */
export async function updateProvider(req, res) {
  const { id } = req.params;
  const { priority, isEnabled, settings } = req.body;

  try {
    const provider = await AIProvider.findById(id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    if (priority !== undefined) provider.priority = priority;
    if (isEnabled !== undefined) provider.isEnabled = isEnabled;
    if (settings) provider.settings = { ...provider.settings, ...settings };

    await provider.save();
    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Reorder providers (drag & drop handler)
 */
export async function reorderProviders(req, res) {
  const { orderedIds } = req.body; // Array of provider IDs in new order

  try {
    const operations = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index + 1 } } // Priority starts at 1
      }
    }));

    await AIProvider.bulkWrite(operations);
    res.json({ success: true, message: 'Provider priorities updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Manage API Keys
 */
export async function manageApiKeys(req, res) {
  const { id } = req.params;
  const { action, keyData } = req.body; // action: 'add', 'remove', 'update'

  try {
    const provider = await AIProvider.findById(id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    if (action === 'add') {
      if (!keyData.key) return res.status(400).json({ error: 'Key required' });
      if (!provider.apiKeys) provider.apiKeys = [];
      
      provider.apiKeys.push({
        key: keyData.key,
        label: keyData.label || `Key ${provider.apiKeys.length + 1}`,
        status: keyData.status || 'active'
      });
    } else if (action === 'remove') {
      provider.apiKeys = provider.apiKeys.filter(k => k._id.toString() !== keyData.keyId);
    } else if (action === 'update') {
      const keyObj = provider.apiKeys.id(keyData.keyId);
      if (keyObj) {
        if (keyData.status) keyObj.status = keyData.status;
        if (keyData.label) keyObj.label = keyData.label;
      }
    }

    await provider.save();

    res.json({ 
      success: true, 
      message: 'API keys updated successfully',
      data: {
        providerId: provider.providerId,
        apiKeysCount: provider.apiKeys ? provider.apiKeys.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Test a provider's API connectivity by calling the actual provider API
 * Keys loaded from database instead of environment variables
 */
export async function testProvider(req, res) {
  const { id } = req.params;
  const { mode = 'lightweight' } = req.query; // lightweight or full

  try {
    const provider = await AIProvider.findById(id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    // Get API keys from database
    const apiKeys = provider.apiKeys || [];

    if (apiKeys.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No API keys configured for this provider. Please sync keys from environment first.',
        providerId: provider.providerId,
        providerName: provider.name,
        keysAvailable: 0,
        hint: 'Use POST /providers/sync-keys to migrate keys from .env to database'
      });
    }

    // Test each key with the provider API
    const testResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < Math.min(apiKeys.length, 3); i++) { // Test up to 3 keys
      const keyObj = apiKeys[i];
      const result = await testProviderKey(provider.providerId, keyObj.key, i + 1, mode);
      
      testResults.push({
        keyIndex: i + 1,
        keyId: keyObj._id,
        keyLabel: keyObj.label,
        status: result.success ? 'VALID' : 'INVALID',
        message: result.message,
        error: result.error || null,
        responseTime: result.responseTime || null,
        testMode: result.testMode || mode
      });

      if (result.success) {
        successCount++;
        // Update key status in database
        keyObj.status = 'active';
        keyObj.lastUsed = new Date();
      } else {
        failureCount++;
        // Mark key as failed
        keyObj.status = 'disabled';
        keyObj.lastFailure = new Date();
        keyObj.failures = (keyObj.failures || 0) + 1;
      }
    }

    // Save updates to database
    await provider.save();

    // Overall status
    const overallSuccess = successCount > 0;

    res.json({
      success: true,
      data: {
        providerId: provider.providerId,
        providerName: provider.name,
        capabilities: provider.capabilities,
        keysAvailable: apiKeys.length,
        keysTested: testResults.length,
        testMode: mode,
        successCount,
        failureCount,
        testResults: testResults,
        testedAt: new Date(),
        overallStatus: overallSuccess ? 'WORKING' : 'FAILED'
      }
    });
  } catch (error) {
    console.error('Test provider error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Test a single API key against the provider's API
 */
async function testProviderKey(providerName, apiKey, keyIndex, mode = 'lightweight') {
  const providerLower = providerName.toLowerCase();
  const startTime = Date.now();

  try {
    // Route to lightweight or full test
    if (mode === 'full') {
      if (providerLower === 'google') {
        return await testGoogleKey(apiKey, keyIndex, startTime);
      } else if (providerLower === 'openai') {
        return await testOpenAIKey(apiKey, keyIndex, startTime);
      } else if (providerLower === 'anthropic') {
        return await testAnthropicKey(apiKey, keyIndex, startTime);
      } else if (providerLower === 'groq') {
        return await testGroqKey(apiKey, keyIndex, startTime);
      } else if (providerLower === 'openrouter') {
        return await testOpenRouterKey(apiKey, keyIndex, startTime);
      } else {
        return {
          success: true,
          message: `Key #${keyIndex} is configured (provider doesn't support full test)`,
          responseTime: 0,
          testMode: 'full'
        };
      }
    } else {
      // Lightweight test - only check authentication
      if (providerLower === 'google') {
        return await testGoogleKeyLightweight(apiKey, keyIndex, startTime);
      } else if (providerLower === 'openai') {
        return await testOpenAIKeyLightweight(apiKey, keyIndex, startTime);
      } else if (providerLower === 'anthropic') {
        return await testAnthropicKeyLightweight(apiKey, keyIndex, startTime);
      } else if (providerLower === 'groq') {
        return await testGroqKeyLightweight(apiKey, keyIndex, startTime);
      } else if (providerLower === 'openrouter') {
        return await testOpenRouterKeyLightweight(apiKey, keyIndex, startTime);
      } else {
        return {
          success: true,
          message: `Key #${keyIndex} is configured`,
          responseTime: 0,
          testMode: 'lightweight'
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to test key #${keyIndex}`,
      error: error.message,
      responseTime: Date.now() - startTime,
      testMode: mode
    };
  }
}

/**
 * LIGHTWEIGHT TEST FUNCTIONS - Only check authentication
 * No model invocation, minimal API calls
 */

async function testGoogleKeyLightweight(apiKey, keyIndex, startTime) {
  try {
    // Just check if key is valid by listing models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid (auth check only)`,
        responseTime,
        testMode: 'lightweight'
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime,
        testMode: 'lightweight'
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime,
        testMode: 'lightweight'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime,
      testMode: 'lightweight'
    };
  }
}

async function testOpenAIKeyLightweight(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid (auth check only)`,
        responseTime,
        testMode: 'lightweight'
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime,
        testMode: 'lightweight'
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime,
        testMode: 'lightweight'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime,
      testMode: 'lightweight'
    };
  }
}

async function testAnthropicKeyLightweight(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid (auth check only)`,
        responseTime,
        testMode: 'lightweight'
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime,
        testMode: 'lightweight'
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime,
        testMode: 'lightweight'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime,
      testMode: 'lightweight'
    };
  }
}

async function testGroqKeyLightweight(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid (auth check only)`,
        responseTime,
        testMode: 'lightweight'
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime,
        testMode: 'lightweight'
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime,
        testMode: 'lightweight'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime,
      testMode: 'lightweight'
    };
  }
}

async function testOpenRouterKeyLightweight(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid (auth check only)`,
        responseTime,
        testMode: 'lightweight'
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime,
        testMode: 'lightweight'
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime,
        testMode: 'lightweight'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime,
      testMode: 'lightweight'
    };
  }
}

/**
 * Test Google Gemini API key
 */
async function testGoogleKey(apiKey, keyIndex, startTime) {
  try {
    // Try multiple model versions - start with latest
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let lastError = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'test' }] }]
          })
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          return {
            success: true,
            message: `Key #${keyIndex} is valid (model: ${model})`,
            responseTime
          };
        } else if (response.status === 401 || response.status === 403) {
          const data = await response.json().catch(() => ({}));
          return {
            success: false,
            message: `Key #${keyIndex} is invalid or expired`,
            error: data.error?.message || 'Authentication failed',
            responseTime
          };
        } else if (response.status === 404) {
          // Model not found, try next one
          lastError = `Model ${model} not found (404)`;
          continue;
        } else {
          const data = await response.json().catch(() => ({}));
          return {
            success: false,
            message: `Key #${keyIndex} returned error ${response.status}`,
            error: data.error?.message || `HTTP ${response.status}`,
            responseTime
          };
        }
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    // If we get here, all models failed
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: lastError || 'Could not find a valid model endpoint',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test OpenAI API key
 */
async function testOpenAIKey(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid and working`,
        responseTime
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test Anthropic API key
 */
async function testAnthropicKey(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'OK' }]
      })
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid and working`,
        responseTime
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test Groq API key
 */
async function testGroqKey(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid and working`,
        responseTime
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test OpenRouter API key
 */
async function testOpenRouterKey(apiKey, keyIndex, startTime) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Key #${keyIndex} is valid and working`,
        responseTime
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Key #${keyIndex} is invalid or expired`,
        error: 'Authentication failed',
        responseTime
      };
    } else {
      return {
        success: false,
        message: `Key #${keyIndex} returned error ${response.status}`,
        error: `HTTP ${response.status}`,
        responseTime
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Key #${keyIndex} test failed`,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Force synchronization of models (manual trigger)
 */
export async function syncModels(req, res) {
  const { force = false } = req.body; // Force bypasses cache check

  try {
    // If forced, we pass a flag to bypass the timestamp check
    const result = await syncModelsWithDB({ forceCheck: force });
    res.json({ success: true, message: 'Model synchronization started', result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Sync API keys from environment variables to database
 * This is a one-time migration operation to move keys from .env to MongoDB
 */
export async function syncKeys(req, res) {
  const { force = false } = req.body;

  try {
    const keyManager = getKeyManager();
    const allKeys = keyManager.getKeyDetails(); // Get all keys from environment
    
    if (!allKeys || Object.keys(allKeys).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No API keys found in environment variables',
        solution: 'Please configure API keys in .env file first'
      });
    }

    const syncResults = {};
    let totalKeysSynced = 0;

    // Sync keys for each provider
    for (const [providerName, keys] of Object.entries(allKeys)) {
      if (!keys || keys.length === 0) continue;

      // Find or create provider in database
      let provider = await AIProvider.findOne({ providerId: providerName.toLowerCase() });
      
      if (!provider) {
        // Create new provider entry
        provider = new AIProvider({
          providerId: providerName.toLowerCase(),
          name: providerName,
          isEnabled: true,
          priority: 100,
          capabilities: {
            analysis: true,
            text: true,
            vision: false,
            image: false,
            video: false
          }
        });
      }

      // Clear existing keys if force=true
      if (force) {
        provider.apiKeys = [];
      }

      // Add/update keys from environment
      const newKeys = [];
      for (const keyDetail of keys) {
        // Get actual key from keyManager
        const providerKeys = keyManager.keys.get(providerName);
        if (providerKeys && providerKeys[keyDetail.index - 1]) {
          const actualKey = providerKeys[keyDetail.index - 1].key;
          
          // Check if key already exists in database
          const existingKey = provider.apiKeys.find(k => k.key === actualKey);
          if (!existingKey) {
            newKeys.push({
              key: actualKey,
              label: `Key ${keyDetail.index}`,
              status: 'active',
              lastUsed: null
            });
          }
        }
      }

      // Add new keys to provider
      provider.apiKeys = [...(provider.apiKeys || []), ...newKeys];
      await provider.save();

      syncResults[providerName] = {
        success: true,
        keysAdded: newKeys.length,
        totalKeysInDB: provider.apiKeys.length
      };
      totalKeysSynced += newKeys.length;
    }

    res.json({
      success: true,
      message: 'API keys synchronized from environment to database',
      data: {
        totalKeysSynced,
        providersUpdated: Object.keys(syncResults).length,
        details: syncResults,
        nextStep: 'All API keys are now stored in the database. You can remove sensitive keys from .env file.',
        warning: 'Keep at least one backup copy of your API keys before removing them from .env'
      }
    });
  } catch (error) {
    console.error('Sync keys error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
