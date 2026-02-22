/**
 * Multi-Video Generation Service
 * Orchestrates sequential video generation with frame chaining and content-aware prompting
 */

import GoogleFlowService from './browser/googleFlowService.js';
import FrameExtractionService from './frameExtractionService.js';
import PromptTemplateGenerator from './promptTemplateGenerator.js';
import ReferenceImageSessionService from './referenceImageSessionService.js';
import { getUseCase, requiresFrameChaining, getSegmentDuration } from '../constants/contentUseCases.js';
import fs from 'fs';
import path from 'path';

class MultiVideoGenerationService {
  constructor() {
    this.googleFlow = new GoogleFlowService();
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
        console.log('└' + '─'.repeat(78) + '┘");

        // Generate video with Google Flow
        const videoResult = await this.googleFlow.generateVideo(segmentPrompt, {
          download: true,
          imageBase64: currentRefImage,
          outputPath: path.join(sessionPath, 'videos'),
          quality: quality,
          aspectRatio: aspectRatio
        });

        if (!videoResult || !videoResult.path) {
          throw new Error(`Failed to generate video segment ${segmentIndex}`);
        }

        console.log(`✅ Video generated: ${path.basename(videoResult.path)}`);

        // Store video info
        const videoInfo = {
          index: segmentIndex,
          url: videoResult.url,
          path: videoResult.path,
          filename: path.basename(videoResult.path),
          duration: Math.ceil(duration / useCaseConfig.videoCount),
          generatedAt: new Date().toISOString()
        };

        videos.push(videoInfo);

        // Step 5: Extract end frame if frame chaining is enabled and not last segment
        if (frameChaining && i < useCaseConfig.videoCount - 1) {
          console.log(`📸 Extracting end frame for next segment...`);

          const frameResult = await this.frameExtractor.extractEndFrames(videoResult.path, 10);

          if (frameResult.success && frameResult.frameBase64) {
            console.log(`✅ Frame extracted and ready for next segment`);
            currentRefImage = frameResult.frameBase64;
            frameMetadata.push({
              fromSegment: segmentIndex,
              toSegment: segmentIndex + 1,
              frame: frameResult.framePath,
              metadata: frameResult.metadata
            });

            videoInfo.endFrame = frameResult.frameBase64;
          } else {
            console.warn(`⚠️  Frame extraction failed, continuing without frame chaining`);
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
   * Quick video generation without use case (backward compatibility)
   * Still supports frame chaining if enabled
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} - { success, video }
   */
  async generateSingleVideo(params) {
    const {
      prompt,
      duration = 10,
      imageBase64 = null,
      quality = 'high',
      aspectRatio = '16:9'
    } = params;

    try {
      const videoResult = await this.googleFlow.generateVideo(prompt, {
        download: true,
        imageBase64: imageBase64,
        quality: quality,
        aspectRatio: aspectRatio
      });

      if (!videoResult || !videoResult.path) {
        throw new Error('Video generation failed');
      }

      return {
        success: true,
        video: videoResult,
        duration: duration
      };

    } catch (error) {
      console.error(`Single video generation error: ${error.message}`);
      return {
        success: false,
        error: error.message
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
   * Close browser (cleanup for GoogleFlow)
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
