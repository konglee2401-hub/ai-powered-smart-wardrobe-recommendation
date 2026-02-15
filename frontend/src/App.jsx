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

// Import components
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <Routes>
          {/* Main Routes */}
          <Route path="/" element={<UnifiedVideoGeneration />} />
          <Route path="/history" element={<GenerationHistory />} />
          <Route path="/stats" element={<ModelStats />} />
          <Route path="/tester" element={<ModelTester />} />
          <Route path="/prompt-builder" element={<PromptBuilder />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/options" element={<OptionsManagement />} />
          
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
