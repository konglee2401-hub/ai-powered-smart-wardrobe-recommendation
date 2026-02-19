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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <Routes>
          {/* Main Routes */}
          <Route path="/" element={<VirtualTryOnPage />} />
          <Route path="/history" element={<GenerationHistory />} />
          <Route path="/stats" element={<ModelStats />} />
          <Route path="/tester" element={<ModelTester />} />
          <Route path="/prompt-builder" element={<PromptBuilder />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/options" element={<OptionsManagement />} />
          <Route path="/batch" element={<BatchProcessingPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/customization" element={<AdvancedCustomizationPage />} />
          <Route path="/performance" element={<PerformanceOptimizerPage />} />
          <Route path="/admin/providers" element={<AIProviderManager />} />
          
          {/* Redirect old routes */}
          <Route path="/model-tester" element={<Navigate to="/tester" replace />} />
          <Route path="/model-stats" element={<Navigate to="/stats" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
