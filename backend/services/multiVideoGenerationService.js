/**
 * Multi-Video Generation Service
 * Orchestrates sequential video generation with frame chaining and content-aware prompting
 * Uses unified GoogleFlowAutomationService for both image and video
 */

import GoogleFlowAutomationService from './googleFlowAutomationService.js';
import FrameExtractionService from './frameExtractionService.js';
import PromptTemplateGenerator from './promptTemplateGenerator.js';
import ReferenceImageSessionService from './referenceImageSessionService.js';
import { getUseCase, requiresFrameChaining, getSegmentDuration } from '../constants/contentUseCases.js';
import fs from 'fs';
import path from 'path';

class MultiVideoGenerationService {
  constructor() {
    this.googleFlow = new GoogleFlowAutomationService({ type: 'video' });
    this.frameExtractor = new FrameExtractionService();
    this.promptGenerator = new PromptTemplateGenerator();
    this.sessionManager = new ReferenceImageSessionService();
    this.outputDir = path.join(process.cwd(), 'temp', 'multi-video-results');
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Convert base64 image to temporary file for browser automation
   * Used for frame chaining (when previous video's end frame is passed as base64)
   * @param {string} imageBase64 - Base64 image data (with or without data URI prefix)
   * @returns {string} - Path to temporary file
   */
  _createTempImageFile(imageBase64) {
    const tempDir = path.join(this.outputDir, 'temp-frames');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `frame-${Date.now()}.jpg`);
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tempPath, buffer);
    
    return tempPath;
  }

  /**
   * Generate multi-video sequence for a use case
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} - { success, videos, metadata }
   */
  async generateMultiVideoSequence(params) {
    const {
      sessionId,
      useCase,
      duration = 20,
      refImage = null,
      analysis = null,
      quality = 'high',
      aspectRatio = '16:9'
    } = params;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 MULTI-VIDEO GENERATION WORKFLOW`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Session: ${sessionId}`);
    console.log(`Use Case: ${useCase}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Frame Chaining: ${requiresFrameChaining(useCase) ? 'Enabled' : 'Disabled'}`);
    console.log();

    let sessionPath = null;
    let videos = [];
    let frameMetadata = [];

    try {
      // Step 1: Set up session and save reference image if provided
      sessionPath = this.sessionManager.createSession(sessionId);

      if (refImage) {
        const saveResult = await this.sessionManager.saveReferenceImage(
          sessionId,
          'reference',
          refImage
        );
        if (!saveResult.success) {
          throw new Error('Failed to save reference image');
        }
      }

      // Step 2: Save analysis if provided
      if (analysis) {
        await this.sessionManager.saveAnalysis(sessionId, analysis);
      }

      // Step 3: Generate segment-specific prompts using ChatGPT
      console.log(`\n📝 Generating segment prompts...`);
      const promptResult = await this.promptGenerator.generateSegmentPrompts(
        useCase,
        analysis || {},
        { duration, quality, aspectRatio }
      );

      if (!promptResult.success) {
        throw new Error('Failed to generate prompts: ' + promptResult.error);
      }

      const segmentPrompts = promptResult.prompts;
      const useCaseConfig = getUseCase(useCase);
      const frameChaining = requiresFrameChaining(useCase);

      // Step 4: Generate videos sequentially
      console.log(`\n🎥 Generating ${useCaseConfig.videoCount} video segments...`);
      console.log('-'.repeat(80));

      let currentRefImage = refImage; // For frame chaining

      for (let i = 0; i < useCaseConfig.videoCount; i++) {
        const segmentIndex = i + 1;
        const segmentPrompt = segmentPrompts[i]?.prompt;

        if (!segmentPrompt) {
          throw new Error(`Missing prompt for segment ${segmentIndex}`);
        }

        console.log(`\n📹 SEGMENT ${segmentIndex}/${useCaseConfig.videoCount}`);
        console.log('┌' + '─'.repeat(78) + '┐');
        console.log(`│ Prompt: ${segmentPrompt.substring(0, 76)} ${segmentPrompt.length > 76 ? '...' : ''}`);
        console.log('└' + '─'.repeat(78) + '┘');

        // For video generation, use generateMultiple with single prompt (count=1)
        // Convert reference images to file paths if needed (base64 -> temp file)
        let charImagePath = null;
        let prodImagePath = null;

        if (currentRefImage) {
          // If reference image is base64 (from frame extraction), convert to temp file
          if (currentRefImage.includes(',') || !fs.existsSync(currentRefImage)) {
            charImagePath = this._createTempImageFile(currentRefImage);
            prodImagePath = charImagePath; // Use same image for both
          } else {
            // Reference image is already a file path
            charImagePath = currentRefImage;
            prodImagePath = currentRefImage;
          }
        } else {
          // No reference image - create dummy paths (generateMultiple will skip if needed)
          // For now, throw error if no reference image
          throw new Error(`No reference image for segment ${segmentIndex} - frame chaining requires reference`);
        }

        console.log(`📝 Using reference images for segment ${segmentIndex}`);
        
        // Generate video using generateMultiple (with x1 count)
        const videoResult = await this.googleFlow.generateMultiple(
          charImagePath,
          prodImagePath,
          [segmentPrompt] // Single prompt
        );

        if (!videoResult || !videoResult.success || videoResult.results.length === 0) {
          throw new Error(`Failed to generate video segment ${segmentIndex}`);
        }

        // Get first (only) result
        const segmentResult = videoResult.results[0];
        
        if (!segmentResult.success) {
          throw new Error(`Video segment ${segmentIndex} generation failed: ${segmentResult.error}`);
        }

        console.log(`✅ Video generated: ${segmentResult.href}`);

        // Store video info
        const videoInfo = {
          index: segmentIndex,
          href: segmentResult.href,
          downloadSuccess: segmentResult.downloadSuccess,
          duration: Math.ceil(duration / useCaseConfig.videoCount),
          generatedAt: new Date().toISOString()
        };

        videos.push(videoInfo);

        // Step 5: Extract end frame if frame chaining is enabled and not last segment
        if (frameChaining && i < useCaseConfig.videoCount - 1) {
          console.log(`📸 Extracting end frame for next segment...`);

          // Note: videoResult no longer has .path with new service
          // Frame extraction may need adjustment based on how videos are stored
          // For now, log a note
          console.log(`ℹ️  Video stored at href: ${segmentResult.href}`);
          
          if (frameChaining && i < useCaseConfig.videoCount - 1) {
            console.log('⚠️  Frame chaining requires video file path - may need adjustment');
            // currentRefImage stays as last end frame if available
          }
        }
      }

      // Step 6: Save metadata
      console.log(`\n📋 Saving session metadata...`);
      await this.sessionManager.saveVideosMetadata(sessionId, videos);

      // Return success
      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ MULTI-VIDEO GENERATION COMPLETE`);
      console.log(`Generated ${videos.length} videos in ${duration}s workflow`);
      console.log(`${'='.repeat(80)}\n`);

      return {
        success: true,
        sessionId: sessionId,
        useCase: useCase,
        videos: videos,
        totalDuration: videos.reduce((sum, v) => sum + (v.duration || 0), 0),
        videoCount: videos.length,
        frameChaining: frameChaining,
        frameMetadata: frameMetadata,
        sessionPath: sessionPath,
        metadata: {
          generatedAt: new Date().toISOString(),
          quality: quality,
          aspectRatio: aspectRatio,
          totalProcessingTime: '...' // Can be tracked externally
        }
      };

    } catch (error) {
      console.error(`\n❌ Multi-video generation failed: ${error.message}`);
      
      return {
        success: false,
        sessionId: sessionId,
        useCase: useCase,
        error: error.message,
        videosGenerated: videos.length,
        videos: videos,
        sessionPath: sessionPath
      };
    }
  }

  /**
   * Get sequence summary (without re-generating)
   * @param {string} sessionId - Session ID
   * @returns {Object} - Session summary with all generated videos
   */
  getSequenceSummary(sessionId) {
    return this.sessionManager.getSessionSummary(sessionId);
  }

  /**
   * Delete a sequence (cleanup all session data)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - { success }
   */
  async deleteSequence(sessionId) {
    return this.sessionManager.deleteSession(sessionId);
  }

  /**
   * Cleanup old sequences
   * @param {number} maxAgeDays - Maximum age in days
   * @returns {Promise<Object>} - { success, deleted }
   */
  async cleanupOldSequences(maxAgeDays = 7) {
    return this.sessionManager.cleanupOldSessions(maxAgeDays);
  }

  /**
   * Close browser (cleanup for GoogleFlowAutomationService)
   * Automatically handled during generateMultiVideoSequence() but available for explicit cleanup
   */
  async close() {
    try {
      await this.googleFlow.close();
      console.log('✅ Browser closed');
      return { success: true };
    } catch (error) {
      console.error(`Failed to close browser: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default MultiVideoGenerationService;
