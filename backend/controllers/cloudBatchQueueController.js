/**
 * Cloud Batch Queue Controller
 * Handles batch processing API endpoints
 */

const CloudBatchQueue = require('../services/cloudBatchQueue');

const batchQueue = new CloudBatchQueue();

// Initialize on first request
let initialized = false;

exports.initializeQueue = async (req, res) => {
  try {
    if (!initialized) {
      await batchQueue.initialize();
      initialized = true;
    }

    res.json({
      success: true,
      message: 'Batch queue initialized',
      stats: batchQueue.getQueueStats(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { name, inputFolder, outputFolder, templateFolder, processType, parameters } =
      req.body;

    if (!name || !processType) {
      return res.status(400).json({
        success: false,
        error: 'name and processType are required',
      });
    }

    const batch = await batchQueue.createBatchFromCloud({
      name,
      inputFolder,
      outputFolder,
      templateFolder,
      processType,
      parameters: parameters || {},
    });

    res.json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.addItemToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { fileId, metadata } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId is required',
      });
    }

    const item = await batchQueue.addItemToBatch(batchId, fileId, metadata);

    res.json({
      success: true,
      message: 'Item added to batch',
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.processBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Start processing asynchronously
    batchQueue.processBatch(batchId).catch((error) => {
      console.error(`Error processing batch ${batchId}:`, error);
    });

    const status = batchQueue.getBatchStatus(batchId);

    res.json({
      success: true,
      message: 'Batch processing started',
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.processBatchSync = async (req, res) => {
  try {
    const { batchId } = req.params;

    await batchQueue.processBatch(batchId);

    const status = batchQueue.getBatchStatus(batchId);

    res.json({
      success: true,
      message: 'Batch processing completed',
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getBatchStatus = (req, res) => {
  try {
    const { batchId } = req.params;

    const status = batchQueue.getBatchStatus(batchId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getAllBatches = (req, res) => {
  try {
    const { filter } = req.query;

    const batches = batchQueue.getAllBatches(filter);

    res.json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getBatchOutput = async (req, res) => {
  try {
    const { batchId } = req.params;

    const output = await batchQueue.getBatchOutput(batchId);

    res.json({
      success: true,
      data: output,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const result = await batchQueue.deleteBatch(batchId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getQueueStats = (req, res) => {
  try {
    const stats = batchQueue.getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.nextItem = async (req, res) => {
  try {
    const { batchId } = req.params;

    const result = await batchQueue.processNextItem(batchId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
