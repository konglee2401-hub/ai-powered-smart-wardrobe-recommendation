
/**
 * Image Prompt Builder
 * Specialized service to construct the final image generation prompt based on use-case.
 * 
 * DESIGNED FOR:
 * - 'change-clothes': Putting a specific product on a specific character
 * - 'ecommerce-product': Focusing on the product details
 * - 'fashion-match': Creating a matching outfit
 */

/**
 * Clean up the prompt by removing extra spaces and newlines
 */
function cleanPrompt(str) {
  return str
    .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
    .replace(/\n/g, ' ')        // Replace newlines with space
    .replace(/\.\s*\./g, '.')   // Fix double periods
    .replace(/,\s*,/g, ',')     // Fix double commas
    .trim();
}

/**
 * Helper: Extract rich character description
 */
function extractCharacterDescription(analysis) {
  if (!analysis?.character) return 'a professional fashion model';
  
  const c = analysis.character;
  const parts = [];
  
  // Base: Age + Ethnicity + Gender
  const age = c.age ? c.age : 'young adult';
  const ethnicity = (c.ethnicity && c.ethnicity !== 'unknown') ? c.ethnicity : '';
  const gender = c.gender || 'model';
  
  parts.push(`${age} ${ethnicity} ${gender}`.trim());
  
  // Body & Skin
  if (c.bodyType) parts.push(`with ${c.bodyType} body type`);
  if (c.skinTone) parts.push(`and ${c.skinTone} skin`);
  
  // Hair & Face
  if (c.hair) {
    const hairStr = [c.hair.length, c.hair.style, c.hair.color, 'hair'].filter(Boolean).join(' ');
    parts.push(`with ${hairStr}`);
  }
  
  if (c.facialFeatures) {
    parts.push(`featuring ${c.facialFeatures}`);
  }
  
  return parts.join(', ');
}

/**
 * Helper: Get technical details for the "Garment Details" section
 */
function getProductTechnicalDetails(analysis) {
  if (!analysis?.product?.technicalDetails) return 'High quality fabric and stitching';
  
  const td = analysis.product.technicalDetails;
  const details = [];
  
  if (td.fabric) details.push(`Fabric: ${td.fabric}`);
  if (td.texture) details.push(`Texture: ${td.texture}`);
  if (td.pattern) details.push(`Pattern: ${td.pattern}`);
  if (td.neckline) details.push(`Neckline: ${td.neckline}`);
  if (td.sleeves) details.push(`Sleeves: ${td.sleeves}`);
  if (td.fit) details.push(`Fit: ${td.fit}`);
  
  return details.join('. ') + '.';
}

/**
 * Helper: Extract rich product description
 */
function extractProductDescription(analysis) {
  if (!analysis?.product) return 'stylish fashion clothing';
  
  const p = analysis.product;
  
  // Priority: Detailed Description > Category + Colors
  if (p.detailedDescription) {
    // Use the first sentence or two of the detailed description to keep it punchy
    const sentences = p.detailedDescription.split('.');
    return sentences.slice(0, 2).join('.').trim();
  }
  
  const color = p.colors ? p.colors.join(' and ') : '';
  const material = p.technicalDetails?.fabric || '';
  const type = p.category || p.type || 'garment';
  
  return `${color} ${material} ${type}`.trim();
}

/**
 * Helper: Extract styling notes
 */
function extractStylingDetails(analysis) {
  if (!analysis?.stylingNotes) return '';
  
  const s = analysis.stylingNotes;
  const notes = [];
  
  if (s.accessories) notes.push(`Accessories: ${s.accessories}`);
  if (s.shoes) notes.push(`Shoes: ${s.shoes}`);
  if (s.makeup) notes.push(`Makeup: ${s.makeup}`);
  
  return notes.join('. ');
}

/**
 * Builds the final prompt for image generation
 * @param {string} basePrompt - The base prompt constructed by the smart prompt builder (usually contains scene/lighting/style)
 * @param {object} analysis - The unified analysis object containing character and product details
 * @param {string} useCase - The specific use case (e.g., 'change-clothes')
 * @returns {string} The optimized prompt for the image generator
 */
export function buildImageGenerationPrompt(basePrompt, analysis, useCase) {
  // 1. Extract core components
  const characterDesc = extractCharacterDescription(analysis);
  const productDesc = extractProductDescription(analysis);
  const stylingDetails = extractStylingDetails(analysis);
  const technicalDetails = getProductTechnicalDetails(analysis);

  // 2. Build prompt based on use-case strategy
  let finalPrompt = '';

  if (useCase === 'change-clothes' || useCase === 'virtual-try-on') {
    // STRATEGY: Explicit instruction to wear the item
    // "A [Character] WEARING [Product]" is the strongest signal
    
    finalPrompt = `
      RAW PHOTOGRAPH, MASTERPIECE.
      
      SUBJECT: ${characterDesc} WEARING ${productDesc}.
      
      GARMENT DETAILS: ${technicalDetails} 
      The garment fits perfectly on the ${analysis?.character?.bodyType || 'body'}.
      Realistic fabric texture, high quality stitching, accurate draping.
      
      STYLING: ${stylingDetails}
      
      ATMOSPHERE & CONTEXT:
      ${basePrompt}
      
      QUALITY: 8k resolution, photorealistic, cinematic lighting, sharp focus, highly detailed skin texture, realistic hair.
    `;
  } 
  else if (useCase === 'ecommerce-product') {
    // STRATEGY: Focus on the product, character is secondary or mannequin
    
    finalPrompt = `
      PROFESSIONAL PRODUCT PHOTOGRAPHY.
      
      MAIN ITEM: ${productDesc}.
      DETAILS: ${technicalDetails}
      
      PRESENTATION:
      ${basePrompt}
      
      QUALITY: Studio lighting, macro details, 8k, sharp focus on fabric texture, commercial fashion standard.
    `;
  }
  else {
    // STRATEGY: Generic fallback or fashion-match
    // Balanced approach
    
    finalPrompt = `
      High fashion editorial shot.
      ${characterDesc} modeling a ${productDesc}.
      
      ${basePrompt}
      
      Detailed texture, professional lighting, award winning photography.
    `;
  }

  // 3. Clean and format
  return cleanPrompt(finalPrompt);
}
