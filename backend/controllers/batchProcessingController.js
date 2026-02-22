import BatchProcessingJob from '../models/BatchProcessingJob.js';
import { handleError } from '../middleware/errorHandler.js';

// Get all batch jobs for a user
export const getAllJobs = async (req, res) => {
  try {
    const { limit = 50, page = 1, status, batchType } = req.query;
    
    let filters = { userId: req.user.id };
    if (status) filters.overallStatus = status;
    if (batchType) filters.batchType = batchType;
    
    const jobs = await BatchProcessingJob.find(filters)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await BatchProcessingJob.countDocuments(filters);
    
    res.json({ 
      success: true, 
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get a specific batch job
export const getJob = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    res.json({ success: true, job });
  } catch (err) {
    handleError(res, err);
  }
};

// Create a new batch job
export const createJob = async (req, res) => {
  try {
    const job = new BatchProcessingJob({
      userId: req.user.id,
      batchName: req.body.batchName,
      batchType: req.body.batchType || 'video',
      priority: req.body.priority || 'normal',
      items: req.body.items || [],
      concurrencySettings: {
        maxConcurrentItems: req.body.maxConcurrentItems || 3,
        maxConcurrentProcessor: req.body.maxConcurrentProcessor || 1
      },
      scheduler: req.body.scheduler || {},
      outputConfig: req.body.outputConfig || {
        createZipArchive: false,
        notificationOnComplete: true
      },
      overallStatus: 'pending'
    });
    
    const savedJob = await job.save();
    res.status(201).json({ 
      success: true, 
      message: 'Batch job created successfully',
      job: savedJob 
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Add items to a batch job
export const addItems = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items must be an array' });
    }
    
    items.forEach(item => {
      job.items.push({
        sourceFileId: item.sourceFileId,
        processingConfig: item.processingConfig || {},
        status: 'pending'
      });
    });
    
    await job.save();
    
    res.json({ 
      success: true, 
      message: `Added ${items.length} items to batch`,
      job
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Update job progress
export const updateProgress = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const { itemId, status, result, error } = req.body;
    
    const item = job.items.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    
    item.status = status;
    if (result) item.result = result;
    if (error) item.error = error;
    
    job.updateProgress();
    await job.save();
    
    res.json({ 
      success: true, 
      message: 'Progress updated',
      job,
      progress: {
        completed: job.progress.completed,
        pending: job.progress.pending,
        failed: job.progress.failed,
        progressPercentage: (job.progress.completed / job.items.length * 100).toFixed(2)
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Check if more items can be processed
export const canProcessMore = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const canProcess = job.canProcessMore();
    const nextItem = job.getNextPendingItem();
    
    res.json({ 
      success: true, 
      canProcess,
      nextItem: nextItem ? nextItem._id : null,
      currentlyProcessing: job.progress.inProgress,
      maxConcurrent: job.concurrencySettings.maxConcurrentItems,
      pendingItems: job.progress.pending
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get next pending item for processing
export const getNextItem = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const nextItem = job.getNextPendingItem();
    if (!nextItem) {
      return res.json({ 
        success: true, 
        message: 'No pending items',
        nextItem: null
      });
    }
    
    res.json({ 
      success: true, 
      nextItem,
      totalItems: job.items.length,
      completedItems: job.progress.completed,
      remainingItems: job.progress.pending
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Pause a batch job
export const pauseJob = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const result = job.pause();
    await job.save();
    
    res.json({ 
      success: true, 
      message: result.message,
      job
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Resume a paused batch job
export const resumeJob = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const result = job.resume();
    await job.save();
    
    res.json({ 
      success: true, 
      message: result.message,
      job
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Cancel a batch job
export const cancelJob = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const result = job.cancel();
    await job.save();
    
    res.json({ 
      success: true, 
      message: result.message,
      cancelledItems: result.cancelledCount,
      job
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get job status and progress
export const getStatus = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const progressPercentage = (job.progress.completed / job.items.length * 100).toFixed(2);
    const estimatedTime = job.calculateEstimatedTime();
    
    res.json({ 
      success: true, 
      status: {
        jobId: job._id,
        batchName: job.batchName,
        overallStatus: job.overallStatus,
        createdAt: job.createdAt,
        progress: {
          total: job.items.length,
          completed: job.progress.completed,
          failed: job.progress.failed,
          pending: job.progress.pending,
          inProgress: job.progress.inProgress,
          progressPercentage
        },
        timing: {
          startedAt: job.processedAt,
          estimatedTimeRemaining: estimatedTime,
          completedAt: job.completedAt || null
        }
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get batch statistics
export const getStats = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const successRate = job.progress.completed / job.items.length * 100;
    const failureRate = job.progress.failed / job.items.length * 100;
    
    const itemsByStatus = {
      pending: job.items.filter(i => i.status === 'pending').length,
      processing: job.items.filter(i => i.status === 'processing').length,
      completed: job.items.filter(i => i.status === 'completed').length,
      failed: job.items.filter(i => i.status === 'failed').length,
      skipped: job.items.filter(i => i.status === 'skipped').length
    };
    
    res.json({ 
      success: true, 
      stats: {
        batchName: job.batchName,
        batchType: job.batchType,
        overallStatus: job.overallStatus,
        totalItems: job.items.length,
        successRate: successRate.toFixed(2),
        failureRate: failureRate.toFixed(2),
        itemsByStatus,
        averageProcessingTime: job.items
          .filter(i => i.completedAt && i.startedAt)
          .reduce((sum, i) => sum + (i.completedAt - i.startedAt), 0) / Math.max(1, job.progress.completed),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Retry failed items
export const retryFailed = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    let retryCount = 0;
    job.items.forEach(item => {
      if (item.status === 'failed' && item.retryCount < (item.maxRetries || 3)) {
        item.status = 'pending';
        item.retryCount = (item.retryCount || 0) + 1;
        retryCount++;
      }
    });
    
    job.updateProgress();
    await job.save();
    
    res.json({ 
      success: true, 
      message: `${retryCount} item(s) queued for retry`,
      retriedCount: retryCount,
      job
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Export batch results
export const exportResults = async (req, res) => {
  try {
    const job = await BatchProcessingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Batch job not found' });
    
    const results = {
      jobId: job._id,
      batchName: job.batchName,
      batchType: job.batchType,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      items: job.items.map(item => ({
        itemId: item._id,
        status: item.status,
        result: item.result,
        error: item.error,
        startedAt: item.startedAt,
        completedAt: item.completedAt
      })),
      summary: {
        total: job.items.length,
        completed: job.progress.completed,
        failed: job.progress.failed,
        pending: job.progress.pending,
        successRate: (job.progress.completed / job.items.length * 100).toFixed(2)
      }
    };
    
    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="batch-${job._id}-results.json"`);
    res.json(results);
  } catch (err) {
    handleError(res, err);
  }
};

// Delete a batch job
export const deleteJob = async (req, res) => {
  try {
    await BatchProcessingJob.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Batch job deleted successfully' });
  } catch (err) {
    handleError(res, err);
  }
};
