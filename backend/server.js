import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

import { UPLOAD_DIR } from './utils/uploadConfig.js';
import * as modelSyncService from './services/modelSyncService.js';
import './services/cleanupService.js'; // Auto-cleanup temp files

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB().then(() => {
  // Auto-sync models after DB connection
  modelSyncService.autoSyncOnStartup();
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from upload directory
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/test', testAuthRoutes);
app.use('/api/clothes', clothingRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/pipeline', pipelineRoutes);
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Smart Wardrobe API' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
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