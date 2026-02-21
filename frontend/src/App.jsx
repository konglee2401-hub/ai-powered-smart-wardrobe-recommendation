import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import pages
import UnifiedVideoGeneration from './pages/UnifiedVideoGeneration';
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

// Import components
import Navbar from './components/Navbar';
import ImageGenerationPage from './pages/ImageGenerationPage';
import VideoGenerationPage from './pages/VideoGenerationPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* ImageGenerationPage - Full screen with Navbar */}
        <Route path="/" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-hidden">
              <ImageGenerationPage />
            </div>
          </div>
        } />
        
        {/* VideoGenerationPage - Full screen with Navbar */}
        <Route path="/video-generation" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-hidden">
              <VideoGenerationPage />
            </div>
          </div>
        } />
        
        {/* Other pages with Navbar - using h-screen flex layout */}
        <Route path="/history" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <GenerationHistory />
            </div>
          </div>
        } />
        <Route path="/stats" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <ModelStats />
            </div>
          </div>
        } />
        <Route path="/tester" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <ModelTester />
            </div>
          </div>
        } />
        <Route path="/prompt-builder" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <PromptBuilder />
            </div>
          </div>
        } />
        <Route path="/dashboard" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <Dashboard />
            </div>
          </div>
        } />
        <Route path="/login" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <Login />
            </div>
          </div>
        } />
        <Route path="/options" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <OptionsManagement />
            </div>
          </div>
        } />
        <Route path="/batch" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <BatchProcessingPage />
            </div>
          </div>
        } />
        <Route path="/gallery" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <GalleryPage />
            </div>
          </div>
        } />
        <Route path="/analytics" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <AnalyticsPage />
            </div>
          </div>
        } />
        <Route path="/customization" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <AdvancedCustomizationPage />
            </div>
          </div>
        } />
        <Route path="/performance" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <PerformanceOptimizerPage />
            </div>
          </div>
        } />
        <Route path="/admin/providers" element={
          <div className="h-screen flex flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1 overflow-y-auto">
              <AIProviderManager />
            </div>
          </div>
        } />
        
        {/* Redirect old routes */}
        <Route path="/model-tester" element={<Navigate to="/tester" replace />} />
        <Route path="/model-stats" element={<Navigate to="/stats" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
