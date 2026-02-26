import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Image as ImageIcon, Film, Clock, Calendar,
  CheckCircle, XCircle, Star, Download, Eye, Code
} from 'lucide-react';

export default function FlowDetail() {
  const { t } = useTranslation();
  const { flowId } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, images, video, prompts
  const [imageRating, setImageRating] = useState(0);
  const [videoRating, setVideoRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  
  useEffect(() => {
    fetchFlowDetail();
  }, [flowId]);
  
  const fetchFlowDetail = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axiosInstance.get(`/api/flows/${flowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setFlow(data.data);
      setImageRating(data.data.feedback?.imageRating || 0);
      setVideoRating(data.data.feedback?.videoRating || 0);
      setFeedbackComment(data.data.feedback?.comments || '');
    } catch (error) {
      console.error('Failed to fetch flow:', error);
      alert('Failed to load generation details');
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/flows/${flowId}/feedback`, {
        imageRating,
        videoRating,
        comments: feedbackComment
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert('Feedback submitted successfully!');
      fetchFlowDetail();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }
  
  if (!flow) return null;
  
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'completed': 'text-green-600',
      'failed': 'text-red-600',
      'generating': 'text-blue-600',
      'pending': 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Back to History
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Generation Details</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>{formatDate(flow.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{Math.round(flow.metadata?.totalDuration || 0)}s total</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-2xl font-bold ${getStatusColor(flow.overallStatus)}`}>
                {flow.overallStatus.replace('-', ' ').toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<Eye size={18} />}
              label="Overview"
            />
            <TabButton
              active={activeTab === 'images'}
              onClick={() => setActiveTab('images')}
              icon={<ImageIcon size={18} />}
              label="Images"
            />
            <TabButton
              active={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              icon={<Film size={18} />}
              label="Video"
            />
            <TabButton
              active={activeTab === 'prompts'}
              onClick={() => setActiveTab('prompts')}
              icon={<Code size={18} />}
              label="Prompts & Analysis"
            />
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Input Images */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Input Images</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-700">Character Image</h3>
                    <img
                      src={flow.characterImage?.url}
                      alt="Character"
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-700">Product Image</h3>
                    <img
                      src={flow.productImage?.url}
                      alt="Product"
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Generation Timeline</h2>
                <div className="space-y-4">
                  
                  {/* Image Generation Step */}
                  <TimelineStep
                    title="Image Generation"
                    status={flow.imageGeneration?.status}
                    startTime={flow.imageGeneration?.startedAt}
                    endTime={flow.imageGeneration?.completedAt}
                    duration={flow.imageGeneration?.duration}
                    error={flow.imageGeneration?.error}
                    details={
                      flow.imageGeneration?.generatedImages?.length > 0 && (
                        <p className="text-sm text-gray-600">
                          Generated {flow.imageGeneration.generatedImages.length} images
                        </p>
                      )
                    }
                  />
                  
                  {/* Video Generation Step */}
                  {flow.videoGeneration?.status !== 'pending' && (
                    <TimelineStep
                      title="Video Generation"
                      status={flow.videoGeneration?.status}
                      startTime={flow.videoGeneration?.startedAt}
                      endTime={flow.videoGeneration?.completedAt}
                      duration={flow.videoGeneration?.duration}
                      error={flow.videoGeneration?.error}
                      details={
                        flow.videoGeneration?.videoUrl && (
                          <p className="text-sm text-gray-600">
                            Model: {flow.videoGeneration.videoModel}
                          </p>
                        )
                      }
                    />
                  )}
                  
                </div>
              </div>
              
              {/* Feedback Section */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Your Feedback</h2>
                
                <div className="space-y-4">
                  {/* Image Rating */}
                  {flow.imageGeneration?.status === 'completed' && (
                    <div>
                      <label className="block mb-2 font-semibold text-gray-700">
                        Rate Generated Images
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setImageRating(rating)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={32}
                              className={rating <= imageRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Video Rating */}
                  {flow.videoGeneration?.status === 'completed' && (
                    <div>
                      <label className="block mb-2 font-semibold text-gray-700">
                        Rate Generated Video
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setVideoRating(rating)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={32}
                              className={rating <= videoRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Comments */}
                  <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Share your thoughts about the generation..."
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none h-24"
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitFeedback}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </>
          )}
          
          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Generated Images</h2>
              
              {flow.imageGeneration?.generatedImages?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {flow.imageGeneration.generatedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url}
                        alt={`Generated ${index + 1}`}
                        className="w-full rounded-lg shadow-md"
                      />
                      
                      {/* Selected Badge */}
                      {index === flow.imageGeneration.selectedImageIndex && (
                        <div className="absolute top-3 right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <CheckCircle size={16} />
                          Selected for Video
                        </div>
                      )}
                      
                      {/* Download Button */}
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = img.url;
                          a.download = `image-${index + 1}.png`;
                          a.click();
                        }}
                        className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition"
                      >
                        <Download size={20} />
                      </button>
                      
                      {/* Seed Info */}
                      {img.seed && (
                        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          Seed: {img.seed}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No images generated yet</p>
              )}
            </div>
          )}
          
          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Generated Video</h2>
              
              {flow.videoGeneration?.videoUrl ? (
                <div className="space-y-4">
                  <video
                    src={flow.videoGeneration.videoUrl}
                    controls
                    className="w-full rounded-lg shadow-lg"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = flow.videoGeneration.videoUrl;
                        a.download = `video-${flowId}.mp4`;
                        a.click();
                      }}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                      <Download size={20} />
                      Download Video
                    </button>
                  </div>
                  
                  {/* Video Metadata */}
                  {flow.videoGeneration.videoMetadata && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Video Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Model:</span>
                          <span className="ml-2 font-semibold">{flow.videoGeneration.videoModel}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <span className="ml-2 font-semibold">{flow.videoGeneration.duration}s</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Film size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No video generated yet</p>
                </div>
              )}
            </div>
          )}
          
          {/* Prompts & Analysis Tab */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              
              {/* Image Prompt */}
              {flow.imageGeneration?.imagePrompt && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Image Generation Prompt</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap">
                    {flow.imageGeneration.imagePrompt}
                  </pre>
                </div>
              )}
              
              {/* Character Analysis */}
              {flow.imageGeneration?.characterAnalysis && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Character Analysis</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(flow.imageGeneration.characterAnalysis, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Product Analysis */}
              {flow.imageGeneration?.productAnalysis && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Product Analysis</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(flow.imageGeneration.productAnalysis, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Video Prompt */}
              {flow.videoGeneration?.userPrompt && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Video User Prompt</h2>
                  <p className="bg-gray-50 p-4 rounded-lg">
                    {flow.videoGeneration.userPrompt}
                  </p>
                </div>
              )}
              
              {/* Final Video Prompt */}
              {flow.videoGeneration?.finalPrompt && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Final Video Generation Prompt</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(flow.videoGeneration.finalPrompt, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Motion Description */}
              {flow.videoGeneration?.motionDescription && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Motion Description</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(flow.videoGeneration.motionDescription, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Camera Instructions */}
              {flow.videoGeneration?.cameraInstructions && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Camera Instructions</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(flow.videoGeneration.cameraInstructions, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Lighting & Atmosphere */}
              {flow.videoGeneration?.lightingAtmosphere && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Lighting & Atmosphere</h2>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(flow.videoGeneration.lightingAtmosphere, null, 2)}
                  </pre>
                </div>
              )}
              
            </div>
          )}
          
        </div>
        
      </div>
    </div>
  );
}

// Helper Components
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold transition ${
        active
          ? 'text-purple-600 border-b-2 border-purple-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TimelineStep({ title, status, startTime, endTime, duration, error, details }) {
  const getStatusIcon = () => {
    if (status === 'completed') return <CheckCircle className="text-green-500" size={24} />;
    if (status === 'failed') return <XCircle className="text-red-500" size={24} />;
    return <Clock className="text-blue-500" size={24} />;
  };
  
  const getStatusColor = () => {
    if (status === 'completed') return 'border-green-500 bg-green-50';
    if (status === 'failed') return 'border-red-500 bg-red-50';
    return 'border-blue-500 bg-blue-50';
  };
  
  return (
    <div className={`border-l-4 pl-4 py-3 ${getStatusColor()}`}>
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-gray-600 capitalize">{status}</p>
          
          {startTime && (
            <p className="text-xs text-gray-500 mt-1">
              Started: {new Date(startTime).toLocaleTimeString()}
            </p>
          )}
          
          {endTime && (
            <p className="text-xs text-gray-500">
              Completed: {new Date(endTime).toLocaleTimeString()}
            </p>
          )}
          
          {duration && (
            <p className="text-xs text-gray-500">
              Duration: {Math.round(duration)}s
            </p>
          )}
          
          {error && (
            <p className="text-sm text-red-600 mt-2">
              Error: {error}
            </p>
          )}
          
          {details && (
            <div className="mt-2">
              {details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
