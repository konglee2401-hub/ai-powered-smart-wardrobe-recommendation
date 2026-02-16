import React, { useState } from 'react';
import PerformanceOptimizer from '../components/PerformanceOptimizer';

const PerformanceOptimizerPage = () => {
  const [currentSettings, setCurrentSettings] = useState({
    imageCount: 2,
    resolution: '1024x1024',
    enableBatch: false,
    modelSettings: {
      steps: 30,
      cfg_scale: 10
    }
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgGenerationTime: 12.5,
    avgQuality: 7.2,
    costPerImage: 0.045,
    successRate: 92
  });

  const handleSettingsChange = (newSettings) => {
    setCurrentSettings(newSettings);
    console.log('Settings changed:', newSettings);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <PerformanceOptimizer 
          currentSettings={currentSettings}
          onSettingsChange={handleSettingsChange}
          performanceMetrics={performanceMetrics}
        />
      </div>

      <style>{`
        .page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .page-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          padding: 2rem;
        }
      `}</style>
    </div>
  );
};

export default PerformanceOptimizerPage;
