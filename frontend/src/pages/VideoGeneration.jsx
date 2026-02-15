import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Film, Sparkles, Clock, CheckCircle, XCircle, Play, Download } from 'lucide-react';
import Navbar from '../components/ui/Navbar';

export default function VideoGeneration() {
  const [characterImage, setCharacterImage] = useState(null);
  const [characterPreview, setCharacterPreview] = useState(null);
  const [referenceMedia, setReferenceMedia] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('runway');
  
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCharacterImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCharacterImage(file);
      setCharacterPreview(URL.createObjectURL(file));
    }
  };

  const handleReferenceMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceMedia(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!characterImage || !prompt) {
      alert('Please provide character image and prompt');
      return;
    }

    const formData = new FormData();
    formData.append('character_image', characterImage);
    if (referenceMedia) formData.append('reference_media', referenceMedia);
    formData.append('prompt', prompt);
    formData.append('model', model);

    setStatus('uploading');
    setProgress(10);
    setProgressPhase('Uploading files...');
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const { data } = await axios.post('/api/videos/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (e) => {
          const uploadProgress = Math.round((e.loaded * 30) / e.total);
          setProgress(10 + uploadProgress);
        }
      });

      // Simulate phases since we can't track real-time
      setProgress(40);
      setProgressPhase('Analyzing character and scene...');
      
      setTimeout(() => {
        setProgress(70);
        setProgressPhase('Engineering detailed prompts...');
      }, 3000);
      
      setTimeout(() => {
        setProgress(90);
        setProgressPhase('Generating video...');
      }, 6000);

      setProgress(100);
      setStatus('completed');
      setResult(data.data);

    } catch (err) {
      console.error(err);
      setStatus('failed');
      setError(err.response?.data?.message || err.message);
    }
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'completed': return <CheckCircle className="text-green-500" size={24} />;
      case 'failed': return <XCircle className="text-red-500" size={24} />;
      default: return <Clock className="text-blue-500 animate-spin" size={24} />;
    }
  };

  const getStatusText = () => {
    const statusTexts = {
      idle: 'Ready to generate',
      uploading: 'Uploading files...',
      analyzing: 'Analyzing character and scene...',
      prompting: 'Engineering detailed prompts...',
      assembling: 'Assembling final prompt...',
      generating: 'Generating video...',
      completed: 'Video generated successfully!',
      failed: 'Generation failed'
    };
    return statusTexts[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="text-purple-600" size={40} />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Video Generation
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Multi-stage AI pipeline for hyper-detailed video generation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            
            {/* Character Image Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block mb-3 font-semibold text-lg flex items-center gap-2">
                <Upload size={20} />
                Character Image *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCharacterImageChange}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition cursor-pointer"
              />
              {characterPreview && (
                <img
                  src={characterPreview}
                  alt="Character preview"
                  className="mt-4 w-full h-64 object-cover rounded-lg"
                />
              )}
            </div>

            {/* Reference Media Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block mb-3 font-semibold text-lg flex items-center gap-2">
                <Film size={20} />
                Reference Media (Optional)
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleReferenceMediaChange}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer"
              />
              {referencePreview && (
                <div className="mt-4">
                  {referenceMedia?.type.startsWith('video/') ? (
                    <video
                      src={referencePreview}
                      controls
                      className="w-full h-64 rounded-lg"
                    />
                  ) : (
                    <img
                      src={referencePreview}
                      alt="Reference preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block mb-3 font-semibold text-lg flex items-center gap-2">
                <Sparkles size={20} />
                Scene Description *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to happen in the video...&#10;Example: walking confidently through a sunny park, smiling and waving at the camera"
                className="w-full p-4 border-2 border-gray-300 rounded-lg h-32 focus:border-purple-500 focus:outline-none transition resize-none"
              />
            </div>

            {/* Model Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block mb-3 font-semibold text-lg">
                Video Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition"
              >
                <option value="runway">Runway Gen-3</option>
                <option value="pika">Pika Labs</option>
                <option value="kling">Kling AI</option>
                <option value="minimax">Minimax</option>
                <option value="stable-video">Stable Video Diffusion</option>
              </select>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!characterImage || !prompt || (status !== 'idle' && status !== 'completed' && status !== 'failed')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {status === 'idle' || status === 'completed' || status === 'failed' ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={20} />
                  Generate Video
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="animate-spin" size={20} />
                  Generating...
                </span>
              )}
            </button>
          </div>

          {/* Right Column: Status & Results */}
          <div className="space-y-6">
            
            {/* Status Display */}
            {status !== 'idle' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon()}
                  <h3 className="text-xl font-semibold">{getStatusText()}</h3>
                </div>

                {/* Progress Bar */}
                {status !== 'completed' && status !== 'failed' && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      {progress}% complete - {progressPhase}
                    </p>
                  </div>
                )}

                {/* Pipeline Stages */}
                {status !== 'idle' && (
                  <div className="space-y-3">
                    <PipelineStage
                      name="Analysis"
                      description="Analyzing character, reference, and scene"
                      completed={['prompting', 'assembling', 'generating', 'completed'].includes(status)}
                      active={status === 'analyzing'}
                    />
                    <PipelineStage
                      name="Prompt Engineering"
                      description="Generating detailed motion, camera, and lighting prompts"
                      completed={['assembling', 'generating', 'completed'].includes(status)}
                      active={status === 'prompting'}
                    />
                    <PipelineStage
                      name="Prompt Assembly"
                      description="Assembling optimized prompt for video AI"
                      completed={['generating', 'completed'].includes(status)}
                      active={status === 'assembling'}
                    />
                    <PipelineStage
                      name="Video Generation"
                      description="Creating final video with AI"
                      completed={status === 'completed'}
                      active={status === 'generating'}
                    />
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-red-700 font-semibold mb-1">Error:</p>
                    <p className="text-red-600">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Results Display */}
            {result && status === 'completed' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={28} />
                  Generated Video
                </h3>

                {/* Video Player */}
                <div className="mb-6 bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    src={result.videoUrl}
                    controls
                    className="w-full"
                    autoPlay
                    loop
                  />
                </div>

                {/* Processing Time */}
                {result.processingTime && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Total Processing Time:</strong> {result.processingTime.total?.toFixed(1)}s
                    </p>
                  </div>
                )}

                {/* Analysis Details */}
                <details className="mb-4">
                  <summary className="cursor-pointer font-semibold text-purple-600 hover:text-purple-700 mb-2">
                    View Analysis Details
                  </summary>
                  <div className="space-y-3 mt-3">
                    {result.analysis?.character && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Character Analysis</h4>
                        <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded whitespace-pre-wrap">
                          {JSON.stringify(result.analysis.character, null, 2)}
                        </pre>
                      </div>
                    )}
                    {result.analysis?.scene && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Scene Analysis</h4>
                        <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded whitespace-pre-wrap">
                          {JSON.stringify(result.analysis.scene, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>

                {/* Final Prompt */}
                <details className="mb-4">
                  <summary className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700 mb-2">
                    View Final Prompt
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {result.finalPrompt?.text_prompt || result.finalPrompt?.prompt || 'No prompt available'}
                    </p>
                  </div>
                </details>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = result.videoUrl;
                      a.download = `video-${Date.now()}.mp4`;
                      a.click();
                    }}
                    className="flex-1 bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setResult(null);
                      setProgress(0);
                      setCharacterImage(null);
                      setCharacterPreview(null);
                      setReferenceMedia(null);
                      setReferencePreview(null);
                      setPrompt('');
                    }}
                    className="flex-1 bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    Generate Another
                  </button>
                </div>

                {/* Feedback Section */}
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <h4 className="font-semibold mb-3">Rate this generation</h4>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => submitFeedback(result.videoGenerationId, rating)}
                        className="text-2xl hover:scale-110 transition"
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Info Card */}
            {status === 'idle' && (
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-3 text-purple-800">
                  How it works
                </h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600">1.</span>
                    <span><strong>Upload</strong> your character image and optional reference</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600">2.</span>
                    <span><strong>Describe</strong> the scene you want to create</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600">3.</span>
                    <span><strong>AI analyzes</strong> character, motion, lighting, and camera work</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600">4.</span>
                    <span><strong>Generates</strong> hyper-detailed prompt for video AI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600">5.</span>
                    <span><strong>Creates</strong> your professional video!</span>
                  </li>
                </ol>
                
                <div className="mt-4 pt-4 border-t border-purple-300">
                  <p className="text-xs text-gray-600">
                    <strong>Tip:</strong> More detailed prompts = better results!
                    Include actions, emotions, and environment details.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for pipeline stages
function PipelineStage({ name, description, completed, active }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition ${
      completed ? 'bg-green-50' : active ? 'bg-blue-50' : 'bg-gray-50'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        completed ? 'bg-green-500' : active ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
      }`}>
        {completed ? (
          <CheckCircle className="text-white" size={18} />
        ) : active ? (
          <Clock className="text-white animate-spin" size={18} />
        ) : (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${
          completed ? 'text-green-700' : active ? 'text-blue-700' : 'text-gray-500'
        }`}>
          {name}
        </p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </div>
  );
}

// Helper function to submit feedback
async function submitFeedback(videoId, rating) {
  try {
    const token = localStorage.getItem('token');
    await axios.post(`/api/videos/${videoId}/feedback`, 
      { rating },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('Thank you for your feedback!');
  } catch (error) {
    console.error('Feedback error:', error);
  }
}
