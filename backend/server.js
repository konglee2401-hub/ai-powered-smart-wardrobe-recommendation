import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server as SocketServer } from 'socket.io';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { printServicesSummary, initKeyManager } from './utils/keyManager.js';
import authRoutes from './routes/authRoutes.js';
import testAuthRoutes from './routes/testAuthRoutes.js';
import clothingRoutes from './routes/clothingRoutes.js';
import outfitRoutes from './routes/outfitRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import promptTemplateRoutes from './routes/promptTemplateRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import unifiedFlowRoutes from './routes/unifiedFlowRoutes.js';
import modelTestRoutes from './routes/modelTestRoutes.js';
import modelsRoutes from './routes/models.js';
import imageGenRoutes from './routes/imageGen.js';
import promptsRoutes from './routes/prompts.js';
import promptOptionsRoutes from './routes/promptOptions.js';
import historyRoutes from './routes/history.js';
import videoGenRoutes from './routes/video.js';
import multiFlowRoutes from './routes/multiFlowRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import browserAutomationRoutes from './routes/browserAutomationRoutes.js';
import promptEnhancementRoutes from './routes/promptEnhancementRoutes.js';
import healthCheckRoutes from './routes/healthCheckRoutes.js';
import aiProviderRoutes from './routes/aiProviderRoutes.js';
import sessionHistoryRoutes from './routes/sessionHistory.js';
import videoAnalyticsAndHistoryRoutes from './routes/videoAnalyticsAndHistoryRoutes.js';
import affiliateVideoRoutes from './routes/affiliateVideoRoutes.js';
import cloudGalleryRoutes from './routes/cloudGalleryRoutes.js';
import cloudBatchQueueRoutes from './routes/cloudBatchQueueRoutes.js';
import videoProductionRoutes from './routes/videoProductionRoutes.js';
import driveUploadRoutes from './routes/driveUploadRoutes.js';
import queueScannerRoutes from './routes/queueScannerRoutes.js';
import ProgressEmitter from './services/ProgressEmitter.js';
import { seedProviders } from './scripts/seedProviders.js';

import { UPLOAD_DIR } from './utils/uploadConfig.js';
import * as modelSyncService from './services/modelSyncService.js';
import './services/cleanupService.js'; // Auto-cleanup temp files

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB().then(async () => {
  // Auto-sync models after DB connection
  await seedProviders(); // Ensure providers exist first
  modelSyncService.autoSyncOnStartup(); // Only one sync - runs after 5s
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3002'] }));

// Increase payload limits to handle base64-encoded images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Set request/response timeout to 10 minutes (600 seconds) for long-running browser automation
app.use((req, res, next) => {
  req.setTimeout(600000);  // 10 minutes
  res.setTimeout(600000);  // 10 minutes
  next();
});

// Serve static files from upload directory
app.use('/uploads', express.static(UPLOAD_DIR));

// Ensure upload temp directory exists
const uploadTempDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}

// 💫 NEW: Serve temporary generated files (images from browser automation)
const tempDir = path.join(process.cwd(), 'temp');
app.use('/temp', express.static(tempDir, {
  setHeaders: (res, filePath) => {
    // Add CORS headers for image files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  }
}));

// 💫 NEW: Endpoint to serve generated images with proper headers
app.get('/api/v1/browser-automation/serve-image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(tempDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Send the file with proper headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/test', testAuthRoutes);
app.use('/api/clothes', clothingRoutes);
app.use('/api/outfits', outfitRoutes);
// app.use('/api/flows', pipelineRoutes); // DEPRECATED: This was the source of the conflict
app.use('/api/prompt-templates', promptTemplateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/flows', unifiedFlowRoutes);
app.use('/api/model-test', modelTestRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/image-gen', imageGenRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/prompt-options', promptOptionsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/video', videoGenRoutes);
app.use('/api/multi-flow', multiFlowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/browser-automation', browserAutomationRoutes);
app.use('/api/prompts', promptEnhancementRoutes);
app.use('/api/prompts-v1', promptsRoutes); // Keep old as v1 for compatibility
app.use('/api', healthCheckRoutes);
app.use('/api/sessions', sessionHistoryRoutes);
app.use('/api/v1/video', videoAnalyticsAndHistoryRoutes);
app.use('/api/affiliate', affiliateVideoRoutes);
app.use('/api/cloud-gallery', cloudGalleryRoutes);
app.use('/api/batch-queue', cloudBatchQueueRoutes);
app.use('/api/video-production', videoProductionRoutes);
app.use('/api/drive', driveUploadRoutes);
app.use('/api/queue-scanner', queueScannerRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST']
  }
});

// Initialize ProgressEmitter with Socket.IO
const progressEmitter = new ProgressEmitter(io);

// Make progress emitter globally accessible
global.progressEmitter = progressEmitter;
global.io = io;

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join a session room
  socket.on('join-session', (sessionId) => {
    socket.join(`video-generation-${sessionId}`);
    console.log(`📹 Joined session: ${sessionId}`);
  });

  // Leave a session room
  socket.on('leave-session', (sessionId) => {
    socket.leave(`video-generation-${sessionId}`);
    console.log(`👋 Left session: ${sessionId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 SERVER STARTED`);
  console.log('='.repeat(80));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(80));
  
  // Print API keys summary
  printServicesSummary();
  
  console.log('✅ Server is ready to accept requests\n');
});

// Set socket and request timeouts to 10 minutes for long-running operations
server.timeout = 600000;          // 10 minutes socket timeout
server.keepAliveTimeout = 610000; // slightly higher than socket timeout