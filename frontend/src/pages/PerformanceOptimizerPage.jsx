import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PerformanceOptimizer from '../components/PerformanceOptimizer';

const PerformanceOptimizerPage = () => {
  const { t } = useTranslation();
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
          background: linear-gradient(165deg, rgba(30, 41, 59, 0.56), rgba(15, 23, 42, 0.74));
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          box-shadow: 0 16px 34px rgba(2, 6, 23, 0.38);
          padding: 2rem;
        }
      `}</style>
    </div>
  );
};

export default PerformanceOptimizerPage;
