import React, { useState, useCallback } from 'react';
import BatchProcessing from '../components/BatchProcessing';
import productPhotoService from '../services/productPhotoService';
import { useTranslation } from 'react-i18next';

const BatchProcessingPage = () => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [results, setResults] = useState([]);

  const handleBatchGenerate = useCallback(async (batchItems) => {
    setIsProcessing(true);
    setBatchProgress({
      overall: 0,
      completed: 0,
      total: batchItems.length,
      elapsed: 0,
      remaining: 0,
      avgTime: 0
    });
    setResults([]);

    const startTime = Date.now();
    const processedResults = [];

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        
        // Update progress to show processing
        setBatchProgress(prev => ({
          ...prev,
          overall: Math.round(((i) / batchItems.length) * 100),
          completed: i,
          elapsed: Math.round((Date.now() - startTime) / 1000)
        }));

        try {
          // Call the image generation service
          const result = await productPhotoService.generateProductPhoto({
            image: item.file,
            template: item.template?.id,
            settings: item.settings,
            useCase: 'batch'
          });

          processedResults.push({
            ...item,
            status: 'completed',
            result: result
          });
        } catch (error) {
          processedResults.push({
            ...item,
            status: 'failed',
            error: error.message
          });
        }

        // Update progress after completion
        const elapsed = Date.now() - startTime;
        const avgTime = elapsed / (i + 1);
        const remaining = (batchItems.length - i - 1) * avgTime;

        setBatchProgress(prev => ({
          ...prev,
          overall: Math.round(((i + 1) / batchItems.length) * 100),
          completed: i + 1,
          elapsed: Math.round(elapsed / 1000),
          remaining: Math.round(remaining / 1000),
          avgTime: Math.round(avgTime / 1000)
        }));
      }

      setResults(processedResults);
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="page-container">
      <div className="page-content">
        <BatchProcessing 
          onBatchGenerate={handleBatchGenerate}
          isProcessing={isProcessing}
          batchProgress={batchProgress}
          maxBatchSize={10}
        />
        
        {/* Results Section */}
        {results.length > 0 && (
          <div className="batch-results">
            <h3>📊 Batch Results</h3>
            <div className="results-summary">
              <div className="result-stat success">
                ✓ {results.filter(r => r.status === 'completed').length} Completed
              </div>
              <div className="result-stat failed">
                ✗ {results.filter(r => r.status === 'failed').length} Failed
              </div>
            </div>
            
            <div className="results-grid">
              {results.map((result, index) => (
                <div key={index} className={`result-item ${result.status}`}>
                  <img src={result.preview} alt={result.name} />
                  <div className="result-info">
                    <div className="result-name">{result.name}</div>
                    <div className="result-status">
                      {result.status === 'completed' ? '✅ Success' : '❌ Failed'}
                    </div>
                    {result.result?.url && (
                      <a 
                        href={result.result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="result-link"
                      >
                        View Result →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .page-content {
          background: linear-gradient(165deg, rgba(30, 41, 59, 0.56), rgba(15, 23, 42, 0.74));
          border-radius: 12px;
          box-shadow: 0 16px 34px rgba(2, 6, 23, 0.38);
          padding: 2rem;
        }
        
        .batch-results {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(148, 163, 184, 0.24);
        }
        
        .batch-results h3 {
          color: #f8fafc;
          margin-bottom: 1rem;
        }
        
        .results-summary {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .result-stat {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
        }
        
        .result-stat.success {
          background: #d4edda;
          color: #155724;
        }
        
        .result-stat.failed {
          background: #f8d7da;
          color: #721c24;
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .result-item {
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(165deg, rgba(30, 41, 59, 0.56), rgba(15, 23, 42, 0.74));
        }
        
        .result-item.completed {
          border-color: #27ae60;
        }
        
        .result-item.failed {
          border-color: #e74c3c;
        }
        
        .result-item img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }
        
        .result-info {
          padding: 1rem;
        }
        
        .result-name {
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 0.5rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .result-status {
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        
        .result-link {
          font-size: 0.85rem;
          color: #3498db;
          text-decoration: none;
        }
        
        .result-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default BatchProcessingPage;
