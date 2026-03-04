/**
 * Index.js - Google Flow Service Modules
 * 
 * Central export point for all modular google-flow service components
 * Simplifies imports: from './google-flow' instead of './google-flow/core/xxx'
 */

// ========== PHASE 1: Foundation Utilities ✅ ==========
// DOM Queries
export { default as DOMElementFinder } from './dom-queries/DOMElementFinder.js';
export { default as VirtuosoQueryHelper } from './dom-queries/VirtuosoQueryHelper.js';

// Utilities
export { default as ClipboardHelper } from './utilities/ClipboardHelper.js';
export { default as MouseInteractionHelper } from './utilities/MouseInteractionHelper.js';

// ========== PHASE 2: Session & Token Management ✅ ==========
export { default as SessionManager } from './core/SessionManager.js';
export { default as TokenManager } from './session/TokenManager.js';

// ========== PHASE 3: Core Automation ✅ ==========
export { default as PromptManager } from './core/PromptManager.js';
export { default as ImageUploadManager } from './upload/ImageUploadManager.js';
export { default as NavigationManager } from './ui-controls/NavigationManager.js';
export { default as SettingsManager } from './ui-controls/SettingsManager.js';

// ========== PHASE 4: Generation & Monitoring ✅ ==========
export { default as PreGenerationMonitor } from './generation/PreGenerationMonitor.js';
export { default as GenerationMonitor } from './generation/GenerationMonitor.js';
export { default as GenerationDownloader } from './generation/GenerationDownloader.js';
export { default as ErrorRecoveryManager } from './error-handling/ErrorRecoveryManager.js';
