import { encodeImage } from '../utils/imageUtils.js';
import axios from 'axios';

// ============================================================================
// Main Export - Provider Configuration
// ============================================================================

const ANALYSIS_PROVIDERS = [
    // --- Google Gemini (Bleeding Edge) ---
    {
        id: 'google-gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash',
        provider: 'google',
        model: 'gemini-2.5-flash', 
        analyze: analyzeWithGoogleGemini,
    },
    {
        id: 'google-gemini-2.0-flash',
        name: 'Google Gemini 2.0 Flash',
        provider: 'google',
        model: 'gemini-2.0-flash',
        analyze: analyzeWithGoogleGemini,
    },
    {
        id: 'google-gemini-3-pro-preview',
        name: 'Google Gemini 3 Pro Preview',
        provider: 'google',
        model: 'gemini-3-pro-preview',
        analyze: analyzeWithGoogleGeminiBeta, // Use v1beta for previews
    },

    // --- OpenRouter (Fallback) ---
    {
        id: 'openrouter-gpt-4o-mini',
        name: 'OpenRouter GPT-4o Mini',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini', // Very reliable vision model
        analyze: analyzeWithOpenAICompatible,
    },
    {
        id: 'openrouter-gemini-pro-1.5',
        name: 'OpenRouter Gemini Pro 1.5',
        provider: 'openrouter',
        model: 'google/gemini-pro-1.5', // Correct OpenRouter ID
        analyze: analyzeWithOpenAICompatible,
    },
    {
        id: 'openrouter-qwen-2-vl-72b',
        name: 'OpenRouter Qwen 2 VL 72B',
        provider: 'openrouter',
        model: 'qwen/qwen-2-vl-72b-instruct',
        analyze: analyzeWithOpenAICompatible,
    },
    {
        id: 'fireworks-llava-next',
        name: 'Fireworks Llava Next',
        provider: 'fireworks',
        model: 'fireworks/firellava-13b',
        analyze: analyzeWithOpenAICompatible,
    },
    {
        id: 'huggingface-kimi',
        name: 'Hugging Face Kimi K2.5',
        provider: 'huggingface',
        model: 'moonshotai/Kimi-K2.5:fastest', // The only verified working HF model
        analyze: analyzeWithHuggingFace,
    }
];

export const getAnalysisProviders = () => {
    return ANALYSIS_PROVIDERS;
};


// ============================================================================
// Provider-Specific Implementations
// ============================================================================

const getSystemPrompt = () => "You are an expert AI fashion stylist. Analyze the provided images and return ONLY a valid JSON object. Do not include any extra text, markdown, or commentary. The JSON should conform to the structure specified in the user's request.";

/**
 *  Handles OpenAI-Compatible APIs (OpenRouter, Fireworks)
 */
async function analyzeWithOpenAICompatible(charPath, prodPath, apiKey, options, prompt) {
    const startTime = Date.now();
    
    const userContent = [{ type: 'text', text: prompt }];
    if (charPath) {
        userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await encodeImage(charPath)}` } });
    }
    if (prodPath) {
        userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await encodeImage(prodPath)}` } });
    }

    const endpoint = this.provider === 'fireworks' 
        ? "https://api.fireworks.ai/inference/v1/chat/completions" 
        : "https://openrouter.ai/api/v1/chat/completions";

    try {
        const response = await axios.post(endpoint, {
            model: this.model,
            messages: [{ role: 'system', content: getSystemPrompt() }, { role: 'user', content: userContent }],
            max_tokens: 4096,
            response_format: { type: 'json_object' },
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 60000 // 60s timeout
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
        const data = (typeof response.data.choices[0].message.content === 'string') 
            ? JSON.parse(response.data.choices[0].message.content)
            : response.data.choices[0].message.content;

        return { data, model: this.model, duration };

    } catch (error) {
        console.error(`Error details for ${this.name}:`, error.response?.data || error.message);
        throw error; // Re-throw the error to be handled by the key rotation logic
    }
}

/**
 *  Handles Google Gemini
 */
async function analyzeWithGoogleGemini(charPath, prodPath, apiKey, options, prompt) {
    const startTime = Date.now();
    
    const imageParts = [];
    if (charPath) {
        imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: await encodeImage(charPath) } });
    }
    if (prodPath) {
        imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: await encodeImage(prodPath) } });
    }

    let textPart = prompt;
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{text: textPart}, ...imageParts] }] },
            { timeout: 60000 } // 60s timeout
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
        const rawContent = response.data.candidates[0].content.parts[0].text;
        const jsonString = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        
        return { data: JSON.parse(jsonString), model: this.model, duration };

    } catch (error) {
        console.error(`Error details for ${this.name}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 *  Handles Google Gemini (v1beta for previews)
 */
async function analyzeWithGoogleGeminiBeta(charPath, prodPath, apiKey, options, prompt) {
    const startTime = Date.now();
    
    const imageParts = [];
    if (charPath) {
        imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: await encodeImage(charPath) } });
    }
    if (prodPath) {
        imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: await encodeImage(prodPath) } });
    }

    let textPart = prompt;
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{text: textPart}, ...imageParts] }] }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
        const rawContent = response.data.candidates[0].content.parts[0].text;
        const jsonString = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        
        return { data: JSON.parse(jsonString), model: this.model, duration };

    } catch (error) {
        console.error(`Error details for ${this.name}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 *  Handles Hugging Face
 */
async function analyzeWithHuggingFace(charPath, prodPath, apiKey, options) {
    const startTime = Date.now();

    const userContent = [{ type: 'text', text: `${getSystemPrompt()} Analyze these images.` }];
    if (charPath) {
        userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await encodeImage(charPath)}` } });
    }
    if (prodPath) {
        userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await encodeImage(prodPath)}` } });
    }
    if (options.singleImage) {
        userContent.push({ type: 'text', text: "NOTE: Only the character image is provided. Please provide an analysis based on that single image." });
    }
    
    try {
        const response = await axios.post("https://router.huggingface.co/v1/chat/completions", {
	        model: this.model,
            messages: [{ role: "user", content: userContent }],
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 60000 // 60s timeout
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
        const rawContent = response.data.choices[0].message.content;
        const jsonString = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        return { data: JSON.parse(jsonString), model: this.model, duration };

    } catch(error) {
        console.error(`Error details for ${this.name}:`, error.response?.data || error.message);
        throw error;
    }
}