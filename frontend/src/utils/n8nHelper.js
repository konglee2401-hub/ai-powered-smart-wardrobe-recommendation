/**
 * N8N Integration Helper Functions
 * Copy these to UnifiedVideoGeneration.jsx
 */

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Generate with N8N Workflow
export const handleGenerateWithN8N = async ({
  characterImage,
  productImage,
  n8nWebhookUrl,
  options,
  setN8nStatus,
  setImageGenStatus,
  setVideoGenStatus,
  setGeneratedImages,
  setGeneratedVideo,
  setCurrentStep,
  axios
}) => {
  if (!characterImage || !productImage) {
    alert('Please upload both character and product images');
    return;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 GENERATING WITH N8N WORKFLOW');
  console.log('='.repeat(80));
  
  setN8nStatus('processing');
  setImageGenStatus('processing');
  setVideoGenStatus('processing');
  
  try {
    const characterBase64 = await fileToBase64(characterImage);
    const productBase64 = await fileToBase64(productImage);
    
    const response = await axios.post(n8nWebhookUrl, {
      characterImage: characterBase64,
      productImage: productBase64,
      options: options
    }, { timeout: 600000 });
    
    if (response.data.images) {
      setGeneratedImages(response.data.images.map((img, idx) => ({
        url: img.url || img.path,
        seed: img.seed || idx,
        format: 'png'
      })));
      setImageGenStatus('completed');
    }
    
    if (response.data.video) {
      setGeneratedVideo({
        url: response.data.video.url || response.data.video.path,
        provider: response.data.video.provider || 'n8n'
      });
      setVideoGenStatus('completed');
    }
    
    setN8nStatus('completed');
    setCurrentStep(3);
    console.log('✅ N8N workflow completed');
    
  } catch (error) {
    console.error('N8N workflow error:', error.message);
    setN8nStatus('failed');
    setImageGenStatus('failed');
    setVideoGenStatus('failed');
    alert(`N8N workflow failed: ${error.message}`);
  }
};
