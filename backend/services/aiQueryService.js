
import axios from 'axios';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKeyManager, executeWithKeyRotation } from '../utils/keyManager.js';

/**
 * The master function for ALL AI model queries.
 * Handles different providers, model types, and response formats consistently.
 */
export async function queryAIModel(provider, model, payload, options = {}) {
    const { 
        type = 'chat', // 'chat' or 'image'
        responseFormat = 'json', // 'json' or 'url'
        systemPrompt = '',
        timeout = 90000,
        apiKey: specificApiKey 
    } = options;

    const executeCall = async (apiKey) => {
        const startTime = Date.now();
        let result;

        console.log(`\n🤖 Calling AI [${provider}/${model}] - Type: ${type}`);

        try {
            if (type === 'image') {
                result = await callImageAPI(provider, model, payload, apiKey, timeout);
            } else {
                result = await callChatAPI(provider, model, payload, systemPrompt, apiKey, responseFormat, timeout);
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
            console.log(`✅ [${provider}] Response received in ${duration}`);
            
            return { ...result, duration };
        } catch (error) {
            console.error(`❌ [${provider}] Error:`, error.response?.data || error.message);
            throw error;
        }
    };

    if (specificApiKey) {
        return executeCall(specificApiKey);
    } else {
        return executeWithKeyRotation(provider.toUpperCase(), executeCall);
    }
}

// Internal helpers to handle the dirty work of provider-specific payloads
async function callChatAPI(provider, model, messages, systemPrompt, apiKey, responseFormat, timeout) {
    // 1. Google Gemini
    if (provider.toUpperCase() === 'GOOGLE') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model });
        
        // Convert prompt to Gemini format
        const prompt = typeof messages === 'string' ? messages : messages[messages.length - 1].content;
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return { text: response.text() };
    }

    // 2. Moonshot AI (OpenAI Compatible)
    if (provider.toUpperCase() === 'MOONSHOT') {
        const client = new OpenAI({ 
            apiKey, 
            baseURL: "https://api.moonshot.ai/v1" 
        });
        
        const response = await client.chat.completions.create({
            model: model,
            messages: typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages,
            temperature: 0.3
        });
        
        return { text: response.choices[0].message.content };
    }
    
    // Default chat implementation (OpenAI compatible) for others
    // ... Simplified for this context as we focus on Image Gen
    return { text: "Chat functionality placeholder" };
}

async function callImageAPI(provider, model, prompt, apiKey, timeout) {


    // 2. FIREWORKS
    if (provider === 'fireworks') {
        // Fireworks uses OpenAI compatible image endpoint
        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.fireworks.ai/inference/v1"
        });

        // Using the specific model path for Fireworks
        const modelPath = model.startsWith('accounts/') ? model : `accounts/fireworks/models/${model}`;

        console.log(`   🚀 Invoking Fireworks model: ${modelPath}`);

        const response = await client.images.generate({
            model: modelPath,
            prompt: prompt,
            n: 1,
            size: "1024x1024", 
            response_format: "b64_json"
        });

        const base64Image = response.data?.[0]?.b64_json;
        if (!base64Image) throw new Error("Fireworks API did not return an image");

        return {
            url: `data:image/png;base64,${base64Image}`,
            base64: base64Image
        };
    }

    // 3. OPENROUTER (Flux/SDXL)
    if (provider === 'openrouter') {
        console.log(`   🚀 Invoking OpenRouter model: ${model}`);
        
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            n: 1
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL || "http://localhost:5000", // Required by OpenRouter
                "X-Title": "Smart Wardrobe"
            },
            timeout: timeout
        });

        const imageUrl = response.data?.choices?.[0]?.message?.content;
        if (!imageUrl) {
            console.error("OpenRouter Response:", JSON.stringify(response.data, null, 2));
            throw new Error("OpenRouter API did not return an image URL in message content");
        }

        return { url: imageUrl };
    }
    
    // 4. GOOGLE GEMINI (Imagen 3)
    if (provider === 'google') {
        console.log(`   🚀 Invoking Google Imagen 3: ${model}`);
        
        // Use the Google Generative AI SDK which now supports Imagen
        // If the model is 'imagen-3.0-generate-001', we use the standard generateContent
        // but the response structure is different (base64 images).
        
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const generativeModel = genAI.getGenerativeModel({ model: model });
            
            const result = await generativeModel.generateContent(prompt);
            const response = result.response;
            
            // Check for candidates
            // The structure is usually response.candidates[0].content.parts[0].inlineData
            // But for Imagen, it might be different. 
            // Let's dump the response if we fail to find it, but usually:
            // candidates[0].content.parts[0].inlineData.data (base64)
            
            // Note: If using Vertex AI, it's different. This is AI Studio.
            // As of Feb 2026 (current date in context), AI Studio supports Imagen 3.
            
            // Try to find image in parts
            // candidates[0].content.parts[0].inlineData.data
            // The structure is typically: response.candidates[0].content.parts[0].inlineData.data
            
            const candidate = result.response.candidates?.[0];
            const content = candidate?.content;
            const parts = content?.parts;
            
            if (parts && parts.length > 0) {
                 for (const part of parts) {
                     if (part.inlineData && (part.inlineData.mimeType.startsWith('image/') || part.inlineData.mimeType === 'image/png' || part.inlineData.mimeType === 'image/jpeg')) {
                         const base64Image = part.inlineData.data;
                         return {
                             url: `data:${part.inlineData.mimeType};base64,${base64Image}`,
                             base64: base64Image
                         };
                     }
                 }
            }
            
            console.error("Google Response structure unexpected:", JSON.stringify(result, null, 2));
            throw new Error("Google API did not return an image part");

        } catch (error) {
            console.error("Google Image Gen Error:", error);
            if (error.message.includes('404')) throw new Error("Model not found or not available in this region");
            if (error.message.includes('403')) throw new Error("API Key invalid or quota exceeded");
            throw error;
        }
    }

    throw new Error(`Provider ${provider} not supported for image generation`);
}
