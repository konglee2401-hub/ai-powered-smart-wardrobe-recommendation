const fs = require('fs');
const path = 'C:/Work/Affiliate-AI/smart-wardrobe/frontend/src/pages/VideoGenerationPage.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import PageHeaderBar from '../components/PageHeaderBar';")) {
  content = content.replace(
    "import SessionLogModal from '../components/SessionLogModal';\n",
    "import SessionLogModal from '../components/SessionLogModal';\nimport PageHeaderBar from '../components/PageHeaderBar';\n",
  );
}

const marker = "  const handleReset = () => {\n    navigate('/virtual-tryon');\n  };\n\n";
const start = content.indexOf(marker);
if (start === -1) {
  throw new Error('Could not find handleReset marker');
}

const replacement = `  const handleReset = () => {
    navigate('/virtual-tryon');
  };

  const scenario = VIDEO_SCENARIOS.find((item) => item.value === selectedScenario);
  const selectedScenarioLabel = scenario?.label || selectedScenario;
  const selectedProviderLabel = VIDEO_PROVIDERS.find((item) => item.id === videoProvider)?.label || videoProvider;
  const segmentCount = calculateSegmentCount(videoProvider, selectedDuration);
  const hasPromptContent = Array.isArray(prompts) && prompts.some((prompt) => {
    if (typeof prompt === 'string') return prompt.trim().length > 0;
    if (typeof prompt === 'object' && prompt?.script) return prompt.script.trim().length > 0;
    return false;
  });
  const isPromptStepReady = Array.isArray(prompts) && prompts.length > 0 && !prompts.some((prompt) => {
    if (!prompt) return true;
    if (typeof prompt === 'string') return prompt.trim().length === 0;
    if (typeof prompt === 'object' && prompt?.script) return prompt.script.trim().length === 0;
    return true;
  });
  const selectedPromptPreview = typeof selectedSegment === 'string'
    ? selectedSegment
    : selectedSegment?.script || '';
  const stepMessage = isGenerating
    ? 'Video generation in progress...'
    : currentStep === 1
      ? 'Set provider, ratio, duration, and scenario assets.'
      : currentStep === 2
        ? 'Refine each segment prompt before rendering.'
        : generated
          ? 'Preview, download, and push outputs to Drive.'
          : 'Review final setup and launch generation.';
  const uploadBannerClass = uploadNotification
    ? uploadNotification.type === 'success'
      ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
      : uploadNotification.type === 'warning'
        ? 'border-amber-700/50 bg-amber-950/40 text-amber-200'
        : 'border-rose-700/50 bg-rose-950/40 text-rose-200'
    : '';
  const sidebarImages = [
    { key: 'characterWearing', label: 'Character', preview: scenarioImages.characterWearing?.preview },
    { key: 'characterHolding', label: 'Product Hold', preview: scenarioImages.characterHolding?.preview },
    { key: 'productReference', label: 'Reference', preview: scenarioImages.productReference?.preview },
  ].filter((item) => item.preview);

  return (
    <div className="-mx-5 -mt-5 flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-[13px] text-white lg:-mx-6 lg:-mt-6">
      <PageHeaderBar
        icon={<Video className="h-4 w-4 text-amber-300" />}
        title={t('videoGeneration.title')}
        subtitle="Video generation workflow"
        meta={
          \
            
        }
      />
    </div>
  );
}
`;

content = content.slice(0, start) + replacement;
fs.writeFileSync(path, content);
