import React, { lazy } from 'react';
import {
  BarChart3,
  BookOpen,
  Clock,
  FileText,
  Film,
  Gauge,
  Image,
  LayoutDashboard,
  Layers,
  Settings,
  Sparkles,
  TrendingUp,
  UserRound,
  Video,
  Volume2,
  Zap,
} from 'lucide-react';

const ImageGenerationPage = lazy(() => import('../pages/ImageGenerationPage'));
const SetupAuthentication = lazy(() => import('../pages/SetupAuthentication'));
const VideoGenerationPage = lazy(() => import('../pages/VideoGenerationPage'));
const VoiceOverPage = lazy(() => import('../pages/VoiceOverPage'));
const OneClickCreatorPage = lazy(() => import('../pages/OneClickCreatorPage'));
const CharacterListPage = lazy(() => import('../pages/CharacterListPage'));
const CharacterCreatorPage = lazy(() => import('../pages/CharacterCreatorPage'));
const GenerationHistory = lazy(() => import('../pages/GenerationHistory'));
const ModelStats = lazy(() => import('../pages/ModelStats'));
const ModelTester = lazy(() => import('../pages/ModelTester'));
const PromptBuilder = lazy(() => import('../pages/PromptBuilder'));
const PromptTemplateManager = lazy(() => import('../pages/PromptTemplateManager'));
const VideoScriptGenerator = lazy(() => import('../pages/VideoScriptGenerator'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const OptionsManagement = lazy(() => import('../pages/OptionsManagement'));
const BatchProcessingPage = lazy(() => import('../pages/BatchProcessingPage'));
const GalleryPage = lazy(() => import('../pages/GalleryPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const AdvancedCustomizationPage = lazy(() => import('../pages/AdvancedCustomizationPage'));
const PerformanceOptimizerPage = lazy(() => import('../pages/PerformanceOptimizerPage'));
const AIProviderManager = lazy(() => import('../pages/AIProviderManager'));
const VideoProduction = lazy(() =>
  import('../pages/VideoProduction').then((module) => ({ default: module.VideoProduction })),
);
const ShortsReelsDashboard = lazy(() => import('../pages/trend-automation/ShortsReelsDashboard'));
const ShortsReelsChannels = lazy(() => import('../pages/trend-automation/ShortsReelsChannels'));
const ShortsReelsVideos = lazy(() => import('../pages/trend-automation/ShortsReelsVideos'));
const ShortsReelsLogs = lazy(() => import('../pages/trend-automation/ShortsReelsLogs'));
const ShortsReelsSettings = lazy(() => import('../pages/trend-automation/ShortsReelsSettings'));

export const pageRoutes = [
  { path: '/', Component: ImageGenerationPage, contentClassName: 'overflow-hidden' },
  { path: '/setup-authentication', Component: SetupAuthentication },
  { path: '/video-generation', Component: VideoGenerationPage, contentClassName: 'overflow-hidden' },
  { path: '/voice-over', Component: VoiceOverPage, contentClassName: 'overflow-hidden' },
  { path: '/generate/one-click', Component: OneClickCreatorPage, contentClassName: 'overflow-hidden' },
  { path: '/characters', Component: CharacterListPage },
  { path: '/characters/create', Component: CharacterCreatorPage },
  { path: '/characters/:id', Component: CharacterCreatorPage },
  { path: '/history', Component: GenerationHistory },
  { path: '/stats', Component: ModelStats },
  { path: '/tester', Component: ModelTester },
  { path: '/prompt-builder', Component: PromptBuilder },
  { path: '/prompt-templates', Component: PromptTemplateManager },
  { path: '/video-script-generator', Component: VideoScriptGenerator },
  { path: '/dashboard', Component: Dashboard },
  { path: '/login', Component: Login },
  { path: '/options', Component: OptionsManagement },
  { path: '/batch', Component: BatchProcessingPage },
  { path: '/gallery', Component: GalleryPage },
  { path: '/analytics', Component: AnalyticsPage },
  { path: '/customization', Component: AdvancedCustomizationPage },
  { path: '/performance', Component: PerformanceOptimizerPage },
  { path: '/admin/providers', Component: AIProviderManager },
  { path: '/video-production', Component: VideoProduction },
  { path: '/shorts-reels/dashboard', Component: ShortsReelsDashboard },
  { path: '/shorts-reels/channels', Component: ShortsReelsChannels },
  { path: '/shorts-reels/videos', Component: ShortsReelsVideos },
  { path: '/shorts-reels/logs', Component: ShortsReelsLogs },
  { path: '/shorts-reels/settings', Component: ShortsReelsSettings },
];

export const redirectRoutes = [
  { path: '/model-tester', to: '/tester' },
  { path: '/model-stats', to: '/stats' },
];

export const navGroups = [
  {
    titleKey: 'navbar.generate',
    items: [
      { path: '/', labelKey: 'navbar.image', icon: Image },
      { path: '/video-generation', labelKey: 'navbar.video', icon: Video },
      { path: '/voice-over', labelKey: 'navbar.voiceover', icon: Volume2 },
      { path: '/generate/one-click', labelKey: 'navbar.oneClick', icon: Sparkles },
      { path: '/characters', label: 'Characters', icon: UserRound },
      { path: '/video-production', labelKey: 'navbar.videoProduction', icon: Film },
    ],
  },
  {
    titleKey: 'navbar.media',
    items: [
      { path: '/gallery', labelKey: 'navbar.gallery', icon: Image },
      { path: '/history', labelKey: 'navbar.history', icon: Clock },
      { path: '/batch', labelKey: 'navbar.batchProcessing', icon: Layers },
    ],
  },
  {
    titleKey: 'navbar.analytics',
    items: [
      { path: '/dashboard', labelKey: 'navbar.dashboard', icon: LayoutDashboard },
      { path: '/stats', labelKey: 'navbar.statistics', icon: BarChart3 },
      { path: '/analytics', labelKey: 'navbar.analytics', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'navbar.tools',
    items: [
      { path: '/prompt-builder', labelKey: 'navbar.promptBuilder', icon: FileText },
      { path: '/prompt-templates', labelKey: 'navbar.promptTemplates', icon: BookOpen },
      { path: '/video-script-generator', labelKey: 'navbar.videoScriptGenerator', icon: Film },
      { path: '/tester', labelKey: 'navbar.providerTester', icon: Zap },
      { path: '/performance', labelKey: 'navbar.performance', icon: Gauge },
      { path: '/shorts-reels/dashboard', label: 'Shorts/Reels', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'navbar.settings',
    items: [
      { path: '/options', labelKey: 'navbar.options', icon: Settings },
      { path: '/customization', labelKey: 'navbar.customization', icon: Sparkles },
      { path: '/setup-authentication', labelKey: 'navbar.setupAuthentication', icon: Gauge },
      { path: '/admin/providers', labelKey: 'navbar.aiProviders', icon: Zap },
    ],
  },
];
