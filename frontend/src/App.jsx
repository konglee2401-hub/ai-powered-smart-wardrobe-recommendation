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
import VirtualTryOnPage from './pages/VirtualTryOnPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* VirtualTryOnPage - Full screen layout WITHOUT Navbar (has its own header) */}
        <Route path="/" element={<VirtualTryOnPage />} />
        
        {/* Other pages with Navbar */}
        <Route path="/history" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><GenerationHistory /></div>
        } />
        <Route path="/stats" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><ModelStats /></div>
        } />
        <Route path="/tester" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><ModelTester /></div>
        } />
        <Route path="/prompt-builder" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><PromptBuilder /></div>
        } />
        <Route path="/dashboard" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><Dashboard /></div>
        } />
        <Route path="/login" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><Login /></div>
        } />
        <Route path="/options" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><OptionsManagement /></div>
        } />
        <Route path="/batch" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><BatchProcessingPage /></div>
        } />
        <Route path="/gallery" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><GalleryPage /></div>
        } />
        <Route path="/analytics" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><AnalyticsPage /></div>
        } />
        <Route path="/customization" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><AdvancedCustomizationPage /></div>
        } />
        <Route path="/performance" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><PerformanceOptimizerPage /></div>
        } />
        <Route path="/admin/providers" element={
          <div className="min-h-screen bg-gray-50"><Navbar /><AIProviderManager /></div>
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
