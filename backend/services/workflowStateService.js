/**
 * WorkflowStateService - Unified workflow state management for all flow types
 * 
 * Supports:
 * - video-generation (6 steps)
 * - one-click (6 steps)
 * - image-generation (3 steps)
 * 
 * Provides:
 * - State persistence to MongoDB
 * - State validation & sanitization
 * - Resume target derivation
 * - In-memory flow state cache
 */

import SessionLogService from './sessionLogService.js';
import SessionLog from '../models/SessionLog.js';

class WorkflowStateService {
  constructor() {
    // In-memory cache for active flows
    this.flowStates = new Map();
  }

  /**
   * Clone workflow state without circular references
   */
  cloneWorkflowState(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  /**
   * Sanitize state before persistence - remove non-serializable data
   */
  sanitizeWorkflowState(state, flowType = 'video-generation') {
    if (state == null) return state;
    if (Buffer.isBuffer(state)) return undefined;
    
    if (Array.isArray(state)) {
      return state
        .map((item) => this.sanitizeWorkflowState(item, flowType))
        .filter((item) => item !== undefined);
    }
    
    if (typeof state !== 'object') return state;

    const next = {};
    const excludeKeys = ['characterImageBuffer', 'productImageBuffer', 'audioBuffer', 'buffer', 'imageBuffer'];
    
    for (const [key, nestedValue] of Object.entries(state)) {
      if (excludeKeys.includes(key)) continue;
      const sanitized = this.sanitizeWorkflowState(nestedValue, flowType);
      if (sanitized !== undefined) {
        next[key] = sanitized;
      }
    }
    return next;
  }

  /**
   * Persist workflow state to MongoDB
   */
  async persistWorkflowState(sessionId, state, flowType = 'video-generation') {
    try {
      const logger = new SessionLogService(sessionId, flowType);
      await logger.init();
      
      const sanitizedState = this.sanitizeWorkflowState(
        { ...state, sessionId, flowType },
        flowType
      );
      
      // Use SessionLog's storeWorkflowState if available, otherwise update directly
      if (logger.sessionLog?.storeWorkflowState) {
        await logger.sessionLog.storeWorkflowState(sanitizedState, { merge: false });
      } else {
        await SessionLog.updateOne(
          { sessionId },
          { 
            workflowState: sanitizedState,
            status: state.status || 'in-progress',
            updatedAt: new Date()
          }
        );
      }
      
      console.log(`[WorkflowState] ✅ Persisted ${flowType} state for ${sessionId}`);
      return sanitizedState;
    } catch (error) {
      console.error(`[WorkflowState] ❌ Failed to persist state: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load workflow state from MongoDB or in-memory cache
   */
  async loadWorkflowState(sessionId) {
    try {
      // Check in-memory cache first
      if (this.flowStates.has(sessionId)) {
        console.log(`[WorkflowState] 📦 Loaded ${sessionId} from memory cache`);
        return this.cloneWorkflowState(this.flowStates.get(sessionId));
      }

      // Load from MongoDB
      const session = await SessionLog.findOne({ sessionId }).select('workflowState status flowType');
      if (!session?.workflowState) {
        console.warn(`[WorkflowState] ⚠️ No workflow state found for ${sessionId}`);
        return null;
      }

      const state = this.cloneWorkflowState(session.workflowState);
      // Cache in memory
      this.flowStates.set(sessionId, state);
      
      console.log(`[WorkflowState] 📦 Loaded ${sessionId} from MongoDB`);
      return state;
    } catch (error) {
      console.error(`[WorkflowState] ❌ Failed to load state: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update in-memory flow state
   */
  setFlowState(sessionId, state) {
    this.flowStates.set(sessionId, this.cloneWorkflowState(state));
    console.log(`[WorkflowState] 💾 Updated ${sessionId} in memory cache`);
  }

  /**
   * Get in-memory flow state
   */
  getFlowState(sessionId) {
    const state = this.flowStates.get(sessionId);
    return state ? this.cloneWorkflowState(state) : null;
  }

  /**
   * Clear in-memory flow state (after completion or cleanup)
   */
  clearFlowState(sessionId) {
    this.flowStates.delete(sessionId);
    console.log(`[WorkflowState] 🗑️ Cleared ${sessionId} from memory cache`);
  }

  /**
   * Derive resume target based on flow type and state
   * Returns: { nextStep, canContinue, shouldPoll, reason }
   */
  deriveResumeTarget(workflowState = {}, flowType = 'video-generation') {
    if (!workflowState || typeof workflowState !== 'object') {
      return { nextStep: 1, canContinue: false, shouldPoll: false, reason: 'missing-state' };
    }

    const status = String(workflowState.status || '').toLowerCase();

    // Terminal states - cannot resume
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      return { nextStep: null, canContinue: false, shouldPoll: false, reason: 'terminal-state' };
    }

    // Route to specific flow type handler
    switch (flowType) {
      case 'image-generation':
        return this._deriveImageGenResumeTarget(workflowState);
      case 'video-generation':
      case 'one-click':
      case 'affiliate-tiktok':
        return this._deriveVideoResumeTarget(workflowState);
      default:
        return { nextStep: 1, canContinue: false, shouldPoll: false, reason: 'unknown-flow' };
    }
  }

  /**
   * Derive resume target for image generation (3-step flow)
   * Step 1: Analysis & recommendations
   * Step 2: Prompt generation
   * Step 3: Image generation
   */
  _deriveImageGenResumeTarget(workflowState = {}) {
    const hasAnalysis = Boolean(
      workflowState.analysis?.recommendations || 
      workflowState.step1?.analysis
    );
    const hasPrompt = Boolean(
      workflowState.prompt || 
      workflowState.step2?.prompt
    );
    const hasGeneratedImages = Boolean(
      workflowState.images?.length > 0 || 
      workflowState.step3?.images?.length
    );

    if (!hasAnalysis) {
      return { nextStep: 1, canContinue: true, shouldPoll: false, reason: 'resume-analysis' };
    }
    if (!hasPrompt) {
      return { nextStep: 2, canContinue: true, shouldPoll: false, reason: 'resume-prompt' };
    }
    if (!hasGeneratedImages) {
      return { nextStep: 3, canContinue: true, shouldPoll: false, reason: 'resume-generation' };
    }

    return { nextStep: null, canContinue: false, shouldPoll: false, reason: 'unknown-state' };
  }

  /**
   * Derive resume target for video generation (6-step flow)
   * Step 1: Analysis
   * Step 2: Frame library generation
   * Step 3: Segment planning
   * Step 4: Video generation
   * Step 5: Voiceover generation
   * Step 6: Final packaging
   */
  _deriveVideoResumeTarget(workflowState = {}) {
    const step2Status = String(workflowState.step2?.status || '').toLowerCase();
    const hasStep1 = Boolean(workflowState.step1?.analysis);
    const hasStep2 = step2Status === 'completed' || Boolean(workflowState.step2?.frameLibrary?.length);
    const hasStep3 = Boolean(workflowState.step3?.segmentPlan?.length || workflowState.step3?.videoScripts?.length);
    const hasStep4 = Boolean(workflowState.step4?.videoPath || workflowState.step4?.segmentVideos?.length);
    const hasStep5 = Boolean(workflowState.step5?.voiceoverText || workflowState.step5?.audioPath);
    const hasStep6 = Boolean(workflowState.step6?.finalPackage);

    if (hasStep6) {
      return { nextStep: 6, canContinue: false, shouldPoll: false, reason: 'completed' };
    }

    // Detect ongoing processing
    const processingStatus = String(workflowState.status || '').toLowerCase();
    if (processingStatus.includes('processing') || processingStatus.includes('generating')) {
      return { nextStep: null, canContinue: false, shouldPoll: true, reason: 'still-processing' };
    }

    // Determine next step
    if (!hasStep1) return { nextStep: 1, canContinue: true, shouldPoll: false, reason: 'resume-step1' };
    if (!hasStep2) return { nextStep: 2, canContinue: true, shouldPoll: false, reason: 'resume-step2' };
    if (!hasStep3) return { nextStep: 3, canContinue: true, shouldPoll: false, reason: 'resume-step3' };
    if (!hasStep4) return { nextStep: 4, canContinue: true, shouldPoll: false, reason: 'resume-step4' };
    if (!hasStep5) return { nextStep: 5, canContinue: true, shouldPoll: false, reason: 'resume-step5' };

    return { nextStep: null, canContinue: false, shouldPoll: false, reason: 'unknown-state' };
  }

  /**
   * Validate if a workflow state is resumable
   */
  isResumable(workflowState = {}, flowType = 'video-generation') {
    if (!workflowState || Object.keys(workflowState).length === 0) {
      return { resumable: false, reason: 'empty-state' };
    }

    const status = String(workflowState.status || '').toLowerCase();
    
    // Terminal states are not resumable
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      return { resumable: false, reason: `terminal-state-${status}` };
    }

    // Get resume target
    const resume = this.deriveResumeTarget(workflowState, flowType);
    
    return {
      resumable: resume.canContinue,
      nextStep: resume.nextStep,
      reason: resume.reason
    };
  }

  /**
   * Create resume response object
   * Supports both legacy signature (sessionId, flowType, session)
   * and object signature ({ sessionId, workflowState, resume, dbStatus, flowType }).
   */
  createResumeResponse(sessionId, flowType, session) {
    if (sessionId && typeof sessionId === 'object' && sessionId.workflowState) {
      const payload = sessionId;
      const workflowState = this.cloneWorkflowState(payload.workflowState);
      const resume = payload.resume || this.deriveResumeTarget(workflowState, payload.flowType || 'image-generation');

      return {
        success: true,
        sessionId: payload.sessionId,
        flowType: workflowState.flowType || payload.flowType || 'image-generation',
        status: workflowState.status,
        workflowState,
        sessionStatus: payload.dbStatus || workflowState.status || 'in-progress',
        error: workflowState.error || null,
        updatedAt: workflowState.updatedAt || new Date().toISOString(),
        nextStep: resume.nextStep,
        canContinue: resume.canContinue,
        shouldPoll: resume.shouldPoll,
        reason: resume.reason
      };
    }

    const workflowState = this.cloneWorkflowState(session.workflowState);
    const resume = this.deriveResumeTarget(workflowState, flowType);

    return {
      success: true,
      sessionId,
      flowType,
      status: workflowState.status,
      workflowState,
      sessionStatus: session.status,
      error: session.error || null,
      updatedAt: session.updatedAt,
      nextStep: resume.nextStep,
      canContinue: resume.canContinue,
      shouldPoll: resume.shouldPoll,
      reason: resume.reason
    };
  }
}

// Export singleton instance
export default new WorkflowStateService();
