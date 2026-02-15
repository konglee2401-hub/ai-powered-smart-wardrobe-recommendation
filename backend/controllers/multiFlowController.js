import MultiFlowOrchestrator from '../services/multiFlowOrchestrator.js';
import path from 'path';

/**
 * Multi-Flow Controller
 * Handles parallel browser automation flows
 */

/**
 * Run multiple flows in parallel
 */
export async function runMultipleFlows(req, res) {
  try {
    const characterImage = req.files?.characterImage?.[0];
    const clothingImage = req.files?.clothingImage?.[0];
    
    if (!characterImage || !clothingImage) {
      return res.status(400).json({
        error: 'Both character and clothing images are required'
      });
    }

    // Parse flow configuration
    const flowTypes = req.body.flows ? JSON.parse(req.body.flows) : ['grok-grok'];
    const imageCount = parseInt(req.body.imageCount) || 1;
    const imageHostProvider = req.body.imageHostProvider || 'auto';

    console.log('\n🎯 MULTI-FLOW REQUEST');
    console.log('='.repeat(80));
    console.log(`Character: ${path.basename(characterImage.path)}`);
    console.log(`Clothing: ${path.basename(clothingImage.path)}`);
    console.log(`Flows: ${flowTypes.join(', ')}`);
    console.log(`Images per flow: ${imageCount}`);
    console.log(`Image host: ${imageHostProvider}`);
    console.log('='.repeat(80) + '\n');

    // Create orchestrator
    const orchestrator = new MultiFlowOrchestrator();

    // Run flows
    const results = await orchestrator.runMultipleFlows(
      flowTypes,
      characterImage.path,
      clothingImage.path,
      {
        imageCount,
        imageHostProvider,
        analysisPrompt: req.body.analysisPrompt,
        generationPrompt: req.body.generationPrompt
      }
    );

    res.json(results);

  } catch (error) {
    console.error('❌ Multi-flow error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Get available flow types
 */
export async function getAvailableFlows(req, res) {
  try {
    const flows = Object.entries(MultiFlowOrchestrator.FLOW_TYPES).map(([key, flow]) => ({
      id: key,
      ...flow
    }));

    res.json({
      success: true,
      flows
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Run single flow
 */
export async function runSingleFlow(req, res) {
  try {
    const characterImage = req.files?.characterImage?.[0];
    const clothingImage = req.files?.clothingImage?.[0];
    const flowType = req.body.flowType || 'grok-grok';

    if (!characterImage || !clothingImage) {
      return res.status(400).json({
        error: 'Both character and clothing images are required'
      });
    }

    const orchestrator = new MultiFlowOrchestrator();

    const result = await orchestrator.runSingleFlow(
      flowType,
      characterImage.path,
      clothingImage.path,
      {
        imageCount: parseInt(req.body.imageCount) || 1,
        imageHostProvider: req.body.imageHostProvider || 'auto',
        analysisPrompt: req.body.analysisPrompt,
        generationPrompt: req.body.generationPrompt
      }
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Single flow error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

export default {
  runMultipleFlows,
  getAvailableFlows,
  runSingleFlow
};
