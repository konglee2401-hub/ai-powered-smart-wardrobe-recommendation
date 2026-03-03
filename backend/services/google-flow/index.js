/**
 * Index.js - Google Flow Service Modules
 * 
 * Central export point for all modular google-flow service components
 * Simplifies imports: from './google-flow' instead of './google-flow/core/xxx'
 */

// DOM Queries
export { DOMElementFinder } from './dom-queries/DOMElementFinder.js';
export { VirtuosoQueryHelper } from './dom-queries/VirtuosoQueryHelper.js';

// Utilities
export { ClipboardHelper } from './utilities/ClipboardHelper.js';
export { MouseInteractionHelper } from './utilities/MouseInteractionHelper.js';

// Will be added in next phases:
// export { SessionManager } from './core/SessionManager.js';
// export { PromptManager } from './core/PromptManager.js';
// export { ImageUploadManager } from './upload/ImageUploadManager.js';
// export { GenerationMonitor } from './generation/GenerationMonitor.js';
// export { ErrorRecoveryManager } from './error-handling/ErrorRecoveryManager.js';
// export { NavigationManager } from './ui-controls/NavigationManager.js';
// export { SettingsManager } from './ui-controls/SettingsManager.js';
