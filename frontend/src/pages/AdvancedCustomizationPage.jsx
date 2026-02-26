import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdvancedCustomization from '../components/AdvancedCustomization';

const AdvancedCustomizationPage = () => {
  const { t } = useTranslation();
  const [selectedOptions, setSelectedOptions] = useState({});
  const [analysis, setAnalysis] = useState(null);

  const handleOptionsChange = (newOptions) => {
    setSelectedOptions(newOptions);
    console.log('Options changed:', newOptions);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <AdvancedCustomization 
          analysis={analysis}
          selectedOptions={selectedOptions}
          onOptionsChange={handleOptionsChange}
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

export default AdvancedCustomizationPage;
