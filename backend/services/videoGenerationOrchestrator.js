// Main orchestrator for the multi-stage video generation pipeline
import { VideoAnalysisService } from './videoAnalysisService.js';
import { VideoPromptEngineer } from './videoPromptEngineer.js';
import { VideoPromptAssembler } from './videoPromptAssembler.js';
import videoGenService from './videoGenService.js';
import VideoGeneration from '../models/VideoGeneration.js';

export class VideoGenerationOrchestrator {
  constructor() {
    this.analysisService = new VideoAnalysisService();
    this.promptEngineer = new VideoPromptEngineer();
    this.promptAssembler = new VideoPromptAssembler();
  }

  /**
   * Main orchestration method - runs entire pipeline
   */
  async generateVideo(request) {
    const {
      userId,
      characterImagePath,
      referenceMediaPath,
      referenceMediaType,
      userPrompt,
      stylePreferences = {},
      targetModel = process.env.VIDEO_MODEL || 'runway'
    } = request;

    // Create database record
    const videoGen = await VideoGeneration.create({
      userId,
      characterImage: characterImagePath,
      referenceMedia: referenceMediaPath,
      referenceMediaType,
      userPrompt,
      videoModel: targetModel,
      status: 'analyzing'
    });

    try {
      console.log('Starting Video Generation Pipeline...');
      console.log(`Video Generation ID: ${videoGen._id}`);

      // ============================================================
      // PHASE 1: PARALLEL ANALYSIS (10-15 seconds)
      // ============================================================
      console.log('PHASE 1: Analyzing inputs...');
      
      const analysisPromises = [
        this.analysisService.analyzeCharacter(characterImagePath)
          .then(data => {
            console.log('  Character analysis complete');
            return data;
          }),
        this.analysisService.analyzeSceneContext(userPrompt)
          .then(data => {
            console.log('  Scene context analysis complete');
            return data;
          })
      ];

      // Add reference analysis if provided
      if (referenceMediaPath) {
        analysisPromises.push(
          this.analysisService.analyzeReference(referenceMediaPath, referenceMediaType)
            .then(data => {
              console.log('  Reference analysis complete');
              return data;
            })
        );
      }

      const analysisResults = await Promise.all(analysisPromises);
      const [characterData, sceneData, referenceData] = analysisResults;

      // Save analysis to database
      videoGen.characterAnalysis = characterData;
      videoGen.sceneAnalysis = sceneData;
      videoGen.referenceAnalysis = referenceData || null;
      videoGen.status = 'prompting';
      await videoGen.save();

      console.log('Phase 1 complete\n');

      // ============================================================
      // PHASE 2: PROMPT ENGINEERING (15-20 seconds)
      // ============================================================
      console.log('PHASE 2: Engineering detailed prompts...');

      const [motionDesc, cameraInst, lightingAtm, consistency] = await Promise.all([
        this.promptEngineer.generateMotionDescription(characterData, referenceData, sceneData)
          .then(data => {
            console.log('  Motion description generated');
            return data;
          }),
        
        this.promptEngineer.generateCameraInstructions(referenceData, sceneData, null)
          .then(data => {
            console.log('  Camera instructions generated');
            return data;
          }),
        
        this.promptEngineer.generateLightingAtmosphere(characterData, sceneData)
          .then(data => {
            console.log('  Lighting & atmosphere designed');
            return data;
          }),
        
        this.promptEngineer.generateConsistencyRules({ characterData, referenceData, sceneData })
          .then(data => {
            console.log('  Consistency rules established');
            return data;
          })
      ]);

      // Save prompt engineering results
      videoGen.motionDescription = motionDesc;
      videoGen.cameraInstructions = cameraInst;
      videoGen.lightingAtmosphere = lightingAtm;
      videoGen.consistencyRules = consistency;
      videoGen.status = 'assembling';
      await videoGen.save();

      console.log('Phase 2 complete\n');

      // ============================================================
      // PHASE 3: PROMPT ASSEMBLY (5-10 seconds)
      // ============================================================
      console.log('PHASE 3: Assembling final optimized prompt...');

      const finalPrompt = await this.promptAssembler.buildFinalPrompt({
        characterAnalysis: characterData,
        referenceAnalysis: referenceData,
        sceneAnalysis: sceneData,
        motionDescription: motionDesc,
        cameraInstructions: cameraInst,
        lightingAtmosphere: lightingAtm,
        consistencyRules: consistency,
        stylePreferences
      }, targetModel);

      videoGen.finalPrompt = finalPrompt;
      videoGen.status = 'generating';
      await videoGen.save();

      console.log('Phase 3 complete\n');
      console.log('Final Prompt Preview:', (finalPrompt.text_prompt || finalPrompt.prompt || '').substring(0, 200) + '...\n');

      // ============================================================
      // PHASE 4: VIDEO GENERATION (60-180 seconds)
      // ============================================================
      console.log('PHASE 4: Generating video...');

      const videoResult = await this.callVideoModel(finalPrompt, targetModel);

      videoGen.videoUrl = videoResult.url;
      videoGen.videoMetadata = videoResult.metadata;
      videoGen.status = 'completed';
      videoGen.completedAt = new Date();
      await videoGen.save();

      console.log('Phase 4 complete');
      console.log(`Video generated: ${videoResult.url}\n`);

      // ============================================================
      // RETURN COMPLETE RESULT
      // ============================================================
      return {
        success: true,
        videoGenerationId: videoGen._id,
        videoUrl: videoResult.url,
        metadata: videoResult.metadata,
        
        // Include all analysis for debugging/refinement
        analysis: {
          character: characterData,
          reference: referenceData,
          scene: sceneData
        },
        
        promptEngineering: {
          motion: motionDesc,
          camera: cameraInst,
          lighting: lightingAtm,
          consistency: consistency
        },
        
        finalPrompt: finalPrompt,
        
        // Timing info
        processingTime: {
          total: (new Date() - videoGen.createdAt) / 1000,
          phases: ['analysis', 'prompting', 'assembly', 'generation']
        }
      };

    } catch (error) {
      console.error('Video generation failed:', error);
      
      videoGen.status = 'failed';
      videoGen.errorMessage = error.message;
      await videoGen.save();
      
      throw error;
    }
  }

  /**
   * Call the actual video generation API
   */
  async callVideoModel(promptData, model) {
    console.log(`Calling ${model} API...`);

    try {
      // Use existing videoGenService
      const result = await videoGenService.generateVideo({
        prompt: promptData.text_prompt || promptData.prompt,
        provider: model === 'runway' ? 'grok' : model, // Map to available providers
        options: {
          durationSeconds: promptData.duration || 5,
          motionStyle: 'smooth'
        }
      });

      return {
        url: result.url || result.videoUrl,
        metadata: result,
        generationTime: 'varies'
      };

    } catch (error) {
      console.error(`${model} API error:`, error.message);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  /**
   * Refine existing generation based on user feedback
   */
  async refineVideo(videoGenerationId, userFeedback) {
    const videoGen = await VideoGeneration.findById(videoGenerationId);
    if (!videoGen) {
      throw new Error('Video generation not found');
    }

    console.log('Refining video based on feedback...');

    // Generate refined prompt
    const refinedPrompt = await this.promptAssembler.buildFinalPrompt({
      characterAnalysis: videoGen.characterAnalysis,
      referenceAnalysis: videoGen.referenceAnalysis,
      sceneAnalysis: videoGen.sceneAnalysis,
      motionDescription: videoGen.motionDescription,
      cameraInstructions: videoGen.cameraInstructions,
      lightingAtmosphere: videoGen.lightingAtmosphere,
      consistencyRules: videoGen.consistencyRules,
      stylePreferences: { refinementFeedback: userFeedback }
    }, videoGen.videoModel);

    // Generate new video
    const videoResult = await this.callVideoModel(refinedPrompt, videoGen.videoModel);

    // Save as new generation with reference to original
    const refinedGen = await VideoGeneration.create({
      userId: videoGen.userId,
      characterImage: videoGen.characterImage,
      referenceMedia: videoGen.referenceMedia,
      referenceMediaType: videoGen.referenceMediaType,
      userPrompt: videoGen.userPrompt,
      videoModel: videoGen.videoModel,
      finalPrompt: refinedPrompt,
      videoUrl: videoResult.url,
      status: 'completed',
      parentGenerationId: videoGenerationId,
      refinementFeedback: userFeedback
    });

    return {
      success: true,
      videoGenerationId: refinedGen._id,
      videoUrl: videoResult.url,
      refinedPrompt: refinedPrompt
    };
  }
}

export default new VideoGenerationOrchestrator();
