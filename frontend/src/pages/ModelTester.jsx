/**
 * Model Tester Page
 * Test different providers and configurations
 */

import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../services/axios';
import { API_BASE_URL } from '../config/api';
import { 
  testProvider,
  getProviderStatus,
  generateProductPhoto,
} from '../services/productPhotoService';
import { validateImageFile } from '../services/axios';
import ImageUpload from '../components/ImageUpload';
import { 
  Zap, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Brain,
  Upload,
  Database,
  TrendingUp,
  Info,
  Settings,
  Download
} from 'lucide-react';

export default function ModelTester() {
  // State management
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState({});
  
  // Test configuration
  const [testImage, setTestImage] = useState(null);
  const [testImagePreview, setTestImagePreview] = useState(null);
  const [testPrompt, setTestPrompt] = useState('Phân tích hình ảnh này chi tiết cho việc thương mại điện tử thời trang.');
  const [testOptions, setTestOptions] = useState({
    quality: 'high',
    style: 'professional',
  });
  
  // Test results
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [testing, setTesting] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Load providers and models
  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statusResult, modelsResult] = await Promise.all([
        getProviderStatus(),
        axiosInstance.get(`/api/ai/models`).catch(() => ({ data: { success: false, data: { models: [] } } }))
      ]);
      
      setProviders(statusResult.data.providers || []);
      setProviderStatus(statusResult.data.status || {});
      
      if (modelsResult.data?.success) {
        setAvailableModels(modelsResult.data.data?.models || []);
      }
    } catch (error) {
      console.error('[Load Providers Error]', error);
      setError(error.message || 'Không thể tải danh sách providers');
    } finally {
      setLoading(false);
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Test handlers
  const handleTestProvider = async (providerId) => {
    setTesting(true);
    setCurrentTest(providerId);
    
    const startTime = Date.now();
    
    try {
      const result = await testProvider(providerId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Add to test results
      setTestResults(prev => [{
        providerId,
        success: result.success,
        duration,
        timestamp: new Date().toISOString(),
        data: result.data,
      }, ...prev]);
      
    } catch (error) {
      console.error('[Test Provider Error]', error);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setTestResults(prev => [{
        providerId,
        success: false,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message,
      }, ...prev]);
    } finally {
      setTesting(false);
      setCurrentTest(null);
    }
  };

  const handleTestWithImage = async () => {
    if (!testImage) {
      setError('Vui lòng upload ảnh test');
      return;
    }
    
    if (!selectedProvider) {
      setError('Vui lòng chọn provider');
      return;
    }
    
    setTesting(true);
    setCurrentTest(selectedProvider);
    
    const startTime = Date.now();
    
    try {
      const result = await generateProductPhoto(
        testImage,
        null,
        {
          ...testOptions,
          provider: selectedProvider,
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setTestResults(prev => [{
        providerId: selectedProvider,
        success: result.success,
        duration,
        timestamp: new Date().toISOString(),
        data: result.data,
        withImage: true,
      }, ...prev]);
      
    } catch (error) {
      console.error('[Test With Image Error]', error);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setTestResults(prev => [{
        providerId: selectedProvider,
        success: false,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message,
        withImage: true,
      }, ...prev]);
    } finally {
      setTesting(false);
      setCurrentTest(null);
    }
  };

  // Image upload handler
  const handleImageUpload = (file) => {
    try {
      validateImageFile(file);
      setTestImage(file);
      setTestImagePreview(URL.createObjectURL(file));
      setError(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleImageRemove = () => {
    setTestImage(null);
    setTestImagePreview(null);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Export results to CSV
  const exportResults = () => {
    const csv = [
      ['Provider', 'Success', 'Duration (ms)', 'Timestamp', 'Error'],
      ...testResults.map(r => [
        r.providerId,
        r.success ? 'Yes' : 'No',
        r.duration,
        r.timestamp,
        r.error || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Statistics
  const successfulTests = testResults.filter(r => r.success);
  const failedTests = testResults.filter(r => !r.success);
  const avgDuration = successfulTests.length > 0
    ? successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-500" />
                Model Tester
              </h1>
              <p className="text-gray-600 mt-2">
                Test và so sánh hiệu suất các providers
              </p>
            </div>
            
            <button
              onClick={loadProviders}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang tải...' : 'Làm Mới'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Provider List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                Providers
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có provider nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <div
                      key={provider.id || provider.name}
                      className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                        selectedProvider === (provider.id || provider.name)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => setSelectedProvider(provider.id || provider.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">
                          {provider.name}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          provider.status === 'active' || provider.available
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {provider.status === 'active' || provider.available ? 'Hoạt động' : 'Không hoạt động'}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestProvider(provider.id || provider.name);
                        }}
                        disabled={testing && currentTest === (provider.id || provider.name)}
                        className="w-full mt-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
                      >
                        {testing && currentTest === (provider.id || provider.name) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang test...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Test Nhanh
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Statistics */}
            {testResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Thống Kê
                </h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Tổng số test:</span>
                    <span className="font-bold">{testResults.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Thành công:
                    </span>
                    <span className="font-bold text-green-600">{successfulTests.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700 flex items-center">
                      <XCircle className="w-4 h-4 mr-1" />
                      Thất bại:
                    </span>
                    <span className="font-bold text-red-600">{failedTests.length}</span>
                  </div>
                  
                  {successfulTests.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm text-purple-700 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        TB Thời gian:
                      </span>
                      <span className="font-bold text-purple-600">{avgDuration.toFixed(0)}ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - Test Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-500" />
                Cấu Hình Test
              </h2>
              
              {/* Image Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh Test
                </label>
                <ImageUpload
                  image={testImagePreview}
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                  label="Upload ảnh test"
                />
              </div>
              
              {/* Test Prompt */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Test
                </label>
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Nhập prompt test..."
                  className="w-full h-24 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                />
              </div>
              
              {/* Options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chất Lượng
                  </label>
                  <select
                    value={testOptions.quality}
                    onChange={(e) => setTestOptions(prev => ({ ...prev, quality: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phong Cách
                  </label>
                  <select
                    value={testOptions.style}
                    onChange={(e) => setTestOptions(prev => ({ ...prev, style: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="professional">Professional</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="minimalist">Minimalist</option>
                    <option value="natural">Natural</option>
                  </select>
                </div>
              </div>
              
              {/* Test Button */}
              <button
                onClick={handleTestWithImage}
                disabled={testing || !testImage || !selectedProvider}
                className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang Test...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Chạy Test Đầy Đủ
                  </>
                )}
              </button>
            </div>

            {/* Actions */}
            {testResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Thao Tác
                </h2>
                
                <div className="space-y-3">
                  <button
                    onClick={exportResults}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Xuất Kết Quả (CSV)
                  </button>

                  <button
                    onClick={clearResults}
                    className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Xóa Kết Quả
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Test Results */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Kết Quả Test</h2>
                {testResults.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {testResults.length} tests
                  </span>
                )}
              </div>
              
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có kết quả test</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Chọn provider và bắt đầu test
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {testResults.map((result, index) => (
                    <TestResultCard key={index} result={result} />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// ============================================
// TEST RESULT CARD COMPONENT
// ============================================

function TestResultCard({ result }) {
  return (
    <div className={`p-4 border-2 rounded-xl ${
      result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-semibold text-gray-800">
            {result.providerId}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {result.duration}ms
        </div>
      </div>
      
      {result.withImage && (
        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full mb-2">
          Test Đầy Đủ
        </span>
      )}
      
      {result.error && (
        <p className="text-sm text-red-600 mt-2">{result.error}</p>
      )}
      
      {result.data?.imageUrl && (
        <img
          src={result.data.imageUrl}
          alt="Test result"
          className="w-full rounded-lg mt-2"
        />
      )}
      
      <p className="text-xs text-gray-500 mt-2">
        {new Date(result.timestamp).toLocaleString('vi-VN')}
      </p>
    </div>
  );
}
