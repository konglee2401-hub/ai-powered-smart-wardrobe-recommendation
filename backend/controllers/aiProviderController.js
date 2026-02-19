
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
 */
export async function getProvidersWithModels(req, res) {
  try {
    const keyManager = getKeyManager(); // Get the key manager instance
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

    // Merge data and enrich with live key data from KeyManager
    const providerList = providers.map(p => {
      const providerKeyDetails = keyManager.getKeyDetails(p.providerId.toUpperCase());
      const keyCount = providerKeyDetails ? providerKeyDetails.length : 0;

      return {
        _id: p._id,
        providerId: p.providerId,
        name: p.name,
        priority: p.priority,
        isEnabled: p.isEnabled,
        capabilities: p.capabilities,
        apiKeysCount: keyCount, // Use live key count from KeyManager
        apiKeys: providerKeyDetails ? providerKeyDetails.map(k => ({
          label: `Key ${k.index}`,
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
      provider.apiKeys.push({
        key: keyData.key,
        label: keyData.label || `Key ${provider.apiKeys.length + 1}`,
        status: 'active'
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
    
    // Refresh KeyManager cache immediately
    const km = getKeyManager(provider.providerId);
    if (km) km.refreshKeysFromDB(provider);

    res.json({ success: true, message: 'API keys updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
