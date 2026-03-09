import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Asset from '../models/Asset.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

/**
 * Helper: Execute Node script and capture output
 */
function executeScript(scriptPath, args = [], timeout = 300000) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
      timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout, code });
      } else {
        reject(new Error(stderr || stdout || `Script failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * GET /api/admin/asset-health
 * Get real-time asset health status without executing full script
 */
router.get('/asset-health', async (req, res) => {
  try {
    const assets = await Asset.find({ status: 'active' }).lean();
    
    const healthy = assets.filter(a => 
      a.localStorage?.path && a.cloudStorage?.googleDriveId
    );
    const localOnly = assets.filter(a => 
      a.localStorage?.path && !a.cloudStorage?.googleDriveId
    );
    const driveOnly = assets.filter(a => 
      !a.localStorage?.path && a.cloudStorage?.googleDriveId
    );
    const broken = assets.filter(a => 
      !a.localStorage?.path && !a.cloudStorage?.googleDriveId
    );

    const stats = {
      total: assets.length,
      healthy: { count: healthy.length, percent: assets.length ? (healthy.length / assets.length * 100).toFixed(1) : 0 },
      localOnly: { count: localOnly.length, percent: assets.length ? (localOnly.length / assets.length * 100).toFixed(1) : 0 },
      driveOnly: { count: driveOnly.length, percent: assets.length ? (driveOnly.length / assets.length * 100).toFixed(1) : 0 },
      broken: { count: broken.length, percent: assets.length ? (broken.length / assets.length * 100).toFixed(1) : 0 },
    };

    // Group by category
    const byCategory = {};
    assets.forEach(asset => {
      const cat = asset.assetCategory || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, healthy: 0, driveOnly: 0 };
      byCategory[cat].total++;
      if (healthy.some(h => h._id === asset._id)) byCategory[cat].healthy++;
      if (driveOnly.some(d => d._id === asset._id)) byCategory[cat].driveOnly++;
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      byCategory,
      recommendation: broken.length === 0 
        ? '✅ All assets are safe with at least one backup'
        : `⚠️ ${broken.length} assets at risk - missing both local and Drive`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/run-asset-health-monitor
 * Execute asset health monitor script
 */
router.post('/run-asset-health-monitor', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../scripts/monitoring/asset-health-monitor.js');
    const result = await executeScript(scriptPath);
    
    res.json({
      success: true,
      message: 'Asset health monitor executed successfully',
      output: result.output
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/run-asset-storage-status
 * Execute asset storage status analysis script
 */
router.post('/run-asset-storage-status', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../scripts/analysis/asset-storage-status.js');
    const result = await executeScript(scriptPath);
    
    res.json({
      success: true,
      message: 'Asset storage analysis executed successfully',
      output: result.output
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/run-delete-orphaned-assets
 * Execute delete orphaned assets script with confirmation
 */
router.post('/run-delete-orphaned-assets', async (req, res) => {
  try {
    const { confirm: shouldConfirm = false } = req.body;
    const args = shouldConfirm ? ['--confirm'] : ['--dry-run'];
    
    const scriptPath = path.join(__dirname, '../scripts/fix/delete-orphaned-assets.js');
    const result = await executeScript(scriptPath, args);
    
    res.json({
      success: true,
      message: `Asset deletion script executed (${shouldConfirm ? 'CONFIRMED' : 'DRY RUN'})`,
      output: result.output,
      isDryRun: !shouldConfirm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/run-batch-upload-orphaned-assets
 * Try to repair pending/failed assets by uploading any recoverable local files to Drive.
 */
router.post('/run-batch-upload-orphaned-assets', async (req, res) => {
  try {
    const { dryRun = false, limit } = req.body || {};
    const args = [];
    if (dryRun) args.push('--dry-run');
    if (limit) args.push(`--limit=${limit}`);

    const scriptPath = path.join(__dirname, '../scripts/fix/batch-upload-orphaned-assets.js');
    const result = await executeScript(scriptPath, args, 900000);

    res.json({
      success: true,
      message: 'Batch upload orphaned assets executed successfully',
      output: result.output
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/run-asset-integrity-cleanup
 * Scan local references and soft-delete assets that no longer have any valid local/cloud storage.
 */
router.post('/run-asset-integrity-cleanup', async (req, res) => {
  try {
    const { dryRun = true, fixBrokenAssets = false, noDeleteOrphans = false } = req.body || {};
    const args = [];
    if (dryRun) args.push('--dry-run');
    if (fixBrokenAssets) args.push('--fix-broken-assets');
    if (noDeleteOrphans) args.push('--no-delete-orphans');

    const scriptPath = path.join(__dirname, '../scripts/maintenance/06-asset-integrity-cleanup.js');
    const result = await executeScript(scriptPath, args, 900000);

    res.json({
      success: true,
      message: 'Asset integrity cleanup executed successfully',
      output: result.output,
      isDryRun: dryRun
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/run-gallery-availability-repair
 * Re-verify local files, promote legacy Drive metadata, and remove unrecoverable assets from gallery.
 */
router.post('/run-gallery-availability-repair', async (req, res) => {
  try {
    const { dryRun = false } = req.body || {};
    const args = [];
    if (dryRun) args.push('--dry-run');

    const scriptPath = path.join(__dirname, '../scripts/maintenance/07-repair-gallery-availability.js');
    const result = await executeScript(scriptPath, args, 900000);

    res.json({
      success: true,
      message: 'Gallery availability repair executed successfully',
      output: result.output,
      isDryRun: dryRun
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/stats/assets
 * Get comprehensive asset statistics
 */
router.get('/stats/assets', async (req, res) => {
  try {
    const assets = await Asset.find().lean();
    
    const stats = {
      total: assets.length,
      active: assets.filter(a => a.status === 'active').length,
      inactive: assets.filter(a => a.status === 'inactive').length,
      
      byType: {},
      byCategory: {},
      byStorage: {
        local: 0,
        drive: 0,
        both: 0,
        none: 0
      },
      
      recent: assets.slice(-10)
    };

    // Count by type and category
    assets.forEach(asset => {
      const type = asset.assetType || 'unknown';
      const category = asset.assetCategory || 'unknown';
      
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      const hasLocal = !!asset.localStorage?.path;
      const hasDrive = !!asset.cloudStorage?.googleDriveId;
      
      if (hasLocal && hasDrive) stats.byStorage.both++;
      else if (hasLocal) stats.byStorage.local++;
      else if (hasDrive) stats.byStorage.drive++;
      else stats.byStorage.none++;
    });

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/cleanup-temp-files
 * Clean up old temporary files
 */
router.post('/cleanup-temp-files', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const tempDirs = [
      path.join(process.cwd(), 'temp/scene-locks'),
      path.join(process.cwd(), 'temp/google-flow'),
      path.join(process.cwd(), 'temp/tiktok-flows')
    ];

    let cleaned = 0;
    const errors = [];

    for (const dir of tempDirs) {
      try {
        if (await fs.access(dir).then(() => true).catch(() => false)) {
          const files = await fs.readdir(dir, { recursive: true });
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
            
            // Delete files older than 7 days
            if (ageHours > 168) {
              await fs.rm(filePath, { force: true });
              cleaned++;
            }
          }
        }
      } catch (error) {
        errors.push(`${dir}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Cleanup completed`,
      cleaned,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
