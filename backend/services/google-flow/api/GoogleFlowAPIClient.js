/**
 * Google Flow API Client
 * Direct API calls to Google Flow backend, bypassing browser UI
 * 
 * Features:
 * - Send custom API requests with seed parameter
 * - Batch generate images with reproducible seeds
 * - Direct API access for more control
 * 
 * Based on: https://aisandbox-pa.googleapis.com/v1/projects/.../flowMedia:batchGenerateImages
 */

import axios from 'axios';
import * as fs from 'fs';
import path from 'path';

class GoogleFlowAPIClient {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.projectId = null;
    this.authToken = null;
    this.recaptchaToken = null;
    this.sessionId = null;
  }

  /**
   * Extract API credentials from browser page
   * Runs JavaScript in browser to get:
   * - Authorization Bearer token
   * - Project ID
   * - Session ID
   * - Recaptcha token (captured from API calls)
   */
  async extractCredentialsFromBrowser() {
    try {
      console.log('   🔍 Extracting API credentials from browser...');

      // Extract from localStorage, sessionStorage, cookies
      const credentials = await this.page.evaluate(() => {
        const authToken = localStorage.getItem('Authorization') || 
                         sessionStorage.getItem('Authorization') ||
                         '';
        
        const projectId = localStorage.getItem('projectId') ||
                         sessionStorage.getItem('projectId') ||
                         '';

        // Try to extract from page URL or data attributes
        const urlParams = new URLSearchParams(window.location.search);
        const urlProjectId = urlParams.get('projectId') || '';

        const sessionId = sessionStorage.getItem('sessionId') || 
                         localStorage.getItem('sessionId') ||
                         `;${Date.now()}`;

        return {
          authToken: authToken,
          projectId: projectId || urlProjectId,
          sessionId: sessionId,
          location: window.location.href
        };
      });

      console.log(`   ✓ Found credentials:`);
      console.log(`     - Auth token: ${credentials.authToken.substring(0, 30)}...`);
      console.log(`     - Project ID: ${credentials.projectId}`);
      console.log(`     - Session ID: ${credentials.sessionId}\n`);

      this.projectId = credentials.projectId;
      this.sessionId = credentials.sessionId;
      
      return credentials;
    } catch (error) {
      console.warn(`   ⚠️  Could not extract credentials: ${error.message}`);
      return null;
    }
  }

  /**
   * Intercept browser fetch requests to capture actual API tokens
   * This runs in the browser and captures real request headers
   */
  async setupRequestInterceptor() {
    try {
      console.log('   🔗 Setting up fetch interceptor...');

      const interceptedData = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          const originalFetch = window.fetch;
          let capturedToken = null;
          let capturedRecaptcha = null;
          let capturedProjectId = null;

          window.fetch = function(...args) {
            const [resource, config] = args;
            
            // Check if it's Google Flow API call
            if (resource && resource.includes('aisandbox-pa.googleapis.com')) {
              const headers = config?.headers || {};
              
              // Capture authorization token
              if (headers.authorization) {
                capturedToken = headers.authorization.replace('Bearer ', '');
              }

              // Capture request body for recaptcha token and project ID
              if (config?.body) {
                try {
                  const body = JSON.parse(config.body);
                  if (body.clientContext?.projectId) {
                    capturedProjectId = body.clientContext.projectId;
                  }
                  if (body.clientContext?.recaptchaContext?.token) {
                    capturedRecaptcha = body.clientContext.recaptchaContext.token;
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }

            return originalFetch.apply(this, args)
              .then(response => {
                // Capture on successful completion
                resolve({
                  token: capturedToken,
                  projectId: capturedProjectId,
                  recaptchaToken: capturedRecaptcha,
                  sessionId: `;${Date.now()}`
                });
                return response;
              });
          };
        });
      });

      this.authToken = interceptedData.token;
      this.projectId = interceptedData.projectId;
      this.recaptchaToken = interceptedData.recaptchaToken;
      this.sessionId = interceptedData.sessionId;

      console.log(`   ✓ Interceptor ready\n`);
      return true;
    } catch (error) {
      console.warn(`   ⚠️  Interceptor setup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send batch generation request directly to Google Flow API
   * With seed parameter for reproducible results
   * 
   * @param {Object} request - Generation request:
   *   - prompt: string
   *   - imageAspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_PORTRAIT'
   *   - imageInputs: array of reference images
   *   - seed: optional seed number (for reproducibility)
   */
  async batchGenerateImages(request) {
    if (!this.projectId || !this.authToken) {
      throw new Error('Missing API credentials. Call setupRequestInterceptor() first.');
    }

    const seed = request.seed || Math.floor(Math.random() * 1000000);
    
    console.log(`   🎯 Sending batch generation request...`);
    console.log(`   📊 Seed: ${seed}`);
    console.log(`   📐 Aspect ratio: ${request.imageAspectRatio}`);
    console.log(`   📝 Prompt length: ${request.prompt.length} chars\n`);

    const requestBody = {
      clientContext: {
        recaptchaContext: {
          token: this.recaptchaToken || '',
          applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB'
        },
        projectId: this.projectId,
        tool: 'PINHOLE',
        sessionId: this.sessionId
      },
      mediaGenerationContext: {
        batchId: this._generateBatchId()
      },
      useNewMedia: true,
      requests: [
        {
          clientContext: {
            recaptchaContext: {
              token: this.recaptchaToken || '',
              applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB'
            },
            projectId: this.projectId,
            tool: 'PINHOLE',
            sessionId: this.sessionId
          },
          imageModelName: 'GEM_PIX_2',  // Google Generative Image 2
          imageAspectRatio: request.imageAspectRatio || 'IMAGE_ASPECT_RATIO_PORTRAIT',
          structuredPrompt: {
            parts: [
              {
                text: request.prompt
              }
            ]
          },
          seed: seed,  // 💫 CRITICAL: Seed for reproducible generation
          imageInputs: request.imageInputs || []
        }
      ]
    };

    try {
      const response = await axios.post(
        `https://aisandbox-pa.googleapis.com/v1/projects/${this.projectId}/flowMedia:batchGenerateImages`,
        requestBody,
        {
          headers: {
            'Accept': '*/*',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7,fr-FR;q=0.6,fr;q=0.5',
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'text/plain;charset=UTF-8',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'x-browser-channel': 'stable',
            'Referer': 'https://labs.google/'
          },
          timeout: 120000
        }
      );

      console.log(`   ✅ Generation request sent successfully`);
      console.log(`   Response status: ${response.status}\n`);

      return {
        success: true,
        seed: seed,
        batchId: requestBody.mediaGenerationContext.batchId,
        response: response.data
      };

    } catch (error) {
      console.error(`   ❌ API request failed: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 500)}`);
      }
      throw error;
    }
  }

  /**
   * Generate UUID for batch ID
   */
  _generateBatchId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Build structuredPrompt with seed embedded
   * Can include seed in both:
   * 1. Prompt text: "SEED: 925090 \n[IMAGE MAPPING]..."
   * 2. Request body: seed: 961638
   * 
   * Using both ensures compatibility with Google Flow internal processing
   */
  static buildStructuredPrompt(basePrompt, seed = null) {
    if (seed) {
      return `SEED: ${seed} \n${basePrompt}`;
    }
    return basePrompt;
  }

  /**
   * Generate seeded unique prompts
   * Useful for A/B testing where you want:
   * - Same base prompt
   * - Different seeds for variation
   * - But still reproducible
   */
  static generateSeededPrompts(basePrompt, count = 4) {
    const prompts = [];
    const baseSeed = Math.floor(Math.random() * 1000000);

    for (let i = 0; i < count; i++) {
      const seed = baseSeed + i;
      prompts.push({
        prompt: this.buildStructuredPrompt(basePrompt, seed),
        seed: seed
      });
    }

    return prompts;
  }
}

export default GoogleFlowAPIClient;
