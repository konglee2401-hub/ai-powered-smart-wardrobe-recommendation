import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import GenerationHistory from './pages/GenerationHistory';
import ModelStats from './pages/ModelStats';
import ModelTester from './pages/ModelTester';
import PromptBuilder from './pages/PromptBuilder';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import OptionsManagement from './pages/OptionsManagement';
import BatchProcessingPage from './pages/BatchProcessingPage';
import GalleryPage from './pages/GalleryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdvancedCustomizationPage from './pages/AdvancedCustomizationPage';
import PerformanceOptimizerPage from './pages/PerformanceOptimizerPage';
import AIProviderManager from './pages/AIProviderManager';
import { VideoProduction } from './pages/VideoProduction';
import VideoScriptGenerator from './pages/VideoScriptGenerator';
import PromptTemplateManager from './pages/PromptTemplateManager';
import SetupAuthentication from './pages/SetupAuthentication';
import Navbar from './components/Navbar';
import ImageGenerationPage from './pages/ImageGenerationPage';
import VideoGenerationPage from './pages/VideoGenerationPage';
import OneClickCreatorPage from './pages/OneClickCreatorPage';
import VoiceOverPage from './pages/VoiceOverPage';
import ShortsReelsDashboard from './pages/trend-automation/ShortsReelsDashboard';
import ShortsReelsChannels from './pages/trend-automation/ShortsReelsChannels';
import ShortsReelsVideos from './pages/trend-automation/ShortsReelsVideos';
import ShortsReelsLogs from './pages/trend-automation/ShortsReelsLogs';
import ShortsReelsSettings from './pages/trend-automation/ShortsReelsSettings';
import CharacterCreatorPage from './pages/CharacterCreatorPage';


function PageTitle() {
  useEffect(() => {
    document.title = 'AI Creative Studio';
  }, []);

  return null;
}

function PageLayout({ children, contentClassName = 'overflow-y-auto' }) {
  return (
    <div className="h-screen bg-[#0f1118] text-slate-100 lg:flex">
      <PageTitle />
      <Navbar />
      <main className={`h-screen flex-1 min-w-0 bg-[#181b24] pt-14 lg:pt-0 ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PageLayout contentClassName="overflow-hidden"><ImageGenerationPage /></PageLayout>} />
        <Route path="/setup-authentication" element={<PageLayout><SetupAuthentication /></PageLayout>} />
        <Route path="/video-generation" element={<PageLayout contentClassName="overflow-hidden"><VideoGenerationPage /></PageLayout>} />
        <Route path="/voice-over" element={<PageLayout contentClassName="overflow-hidden"><VoiceOverPage /></PageLayout>} />
        <Route path="/generate/one-click" element={<PageLayout contentClassName="overflow-hidden"><OneClickCreatorPage /></PageLayout>} />
        <Route path="/characters" element={<PageLayout><CharacterCreatorPage /></PageLayout>} />
        <Route path="/history" element={<PageLayout><GenerationHistory /></PageLayout>} />
        <Route path="/stats" element={<PageLayout><ModelStats /></PageLayout>} />
        <Route path="/tester" element={<PageLayout><ModelTester /></PageLayout>} />
        <Route path="/prompt-builder" element={<PageLayout><PromptBuilder /></PageLayout>} />
        <Route path="/prompt-templates" element={<PageLayout><PromptTemplateManager /></PageLayout>} />
        <Route path="/video-script-generator" element={<PageLayout><VideoScriptGenerator /></PageLayout>} />
        <Route path="/dashboard" element={<PageLayout><Dashboard /></PageLayout>} />
        <Route path="/login" element={<PageLayout><Login /></PageLayout>} />
        <Route path="/options" element={<PageLayout><OptionsManagement /></PageLayout>} />
        <Route path="/batch" element={<PageLayout><BatchProcessingPage /></PageLayout>} />
        <Route path="/gallery" element={<PageLayout><GalleryPage /></PageLayout>} />
        <Route path="/analytics" element={<PageLayout><AnalyticsPage /></PageLayout>} />
        <Route path="/customization" element={<PageLayout><AdvancedCustomizationPage /></PageLayout>} />
        <Route path="/performance" element={<PageLayout><PerformanceOptimizerPage /></PageLayout>} />
        <Route path="/admin/providers" element={<PageLayout><AIProviderManager /></PageLayout>} />
        <Route path="/video-production" element={<PageLayout><VideoProduction /></PageLayout>} />
        <Route path="/shorts-reels/dashboard" element={<PageLayout><ShortsReelsDashboard /></PageLayout>} />
        <Route path="/shorts-reels/channels" element={<PageLayout><ShortsReelsChannels /></PageLayout>} />
        <Route path="/shorts-reels/videos" element={<PageLayout><ShortsReelsVideos /></PageLayout>} />
        <Route path="/shorts-reels/logs" element={<PageLayout><ShortsReelsLogs /></PageLayout>} />
        <Route path="/shorts-reels/settings" element={<PageLayout><ShortsReelsSettings /></PageLayout>} />

        {/* Redirect old routes */}
        <Route path="/model-tester" element={<Navigate to="/tester" replace />} />
        <Route path="/model-stats" element={<Navigate to="/stats" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
