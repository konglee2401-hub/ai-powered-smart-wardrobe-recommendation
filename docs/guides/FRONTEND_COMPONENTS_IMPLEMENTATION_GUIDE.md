# ⚛️ Video Mass Production - Frontend Implementation Guide

## 📝 Code Examples & Component Templates

---

## 1. Enhanced VideoProduction Main Page

### **VideoProduction.jsx** (Updated)

```jsx
/**
 * Video Production Dashboard - Enhanced
 * Added: Mashup Creator, Processing Monitor, Media Browser
 */

import React, { useEffect, useState } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { SystemStatus } from '@/components/VideoProduction/SystemStatus';
import { QueueStatus } from '@/components/VideoProduction/QueueStatus';
import { AccountCard } from '@/components/VideoProduction/AccountCard';
import { VideoMashupCreator } from '@/components/VideoProduction/VideoMashupCreator';
import { ProcessingMonitor } from '@/components/VideoProduction/ProcessingMonitor';
import { MediaLibraryBrowser } from '@/components/VideoProduction/MediaLibraryBrowser';
import { CronJobManager } from '@/components/VideoProduction/CronJobManager';
import { Video, Users, Library, Zap, Plus, Play, Grid3x3 } from 'lucide-react';
import toast from 'react-hot-toast';

export function VideoProduction() {
  const {
    getAllAccounts,
    getAccountStats,
    addAccount,
    accounts,
    queue,
  } = useVideoProductionStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddAccount, setShowAddAccount] = useState(false);

  useEffect(() => {
    getAllAccounts();
    getAccountStats();
  }, [getAllAccounts, getAccountStats]);

  const tabButtons = [
    { id: 'overview', label: 'Overview', icon: Video },
    { id: 'creator', label: 'Create Mashup', icon: Grid3x3 },
    { id: 'processing', label: 'Processing', icon: Play },
    { id: 'queue', label: 'Queue', icon: Zap },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'media', label: 'Media Library', icon: Library },
    { id: 'automation', label: 'Automation', icon: Zap },
  ];

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Video Production System</h1>
        <p className="text-gray-400">Manage automated video generation and distribution</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-0 overflow-x-auto">
        {tabButtons.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && <SystemStatus />}
        {activeTab === 'creator' && <VideoMashupCreator />}
        {activeTab === 'processing' && <ProcessingMonitor />}
        {activeTab === 'queue' && <QueueStatus />}
        {activeTab === 'accounts' && <AccountManagement />}
        {activeTab === 'media' && <MediaLibraryBrowser />}
        {activeTab === 'automation' && <CronJobManager />}
      </div>
    </div>
  );
}

function AccountManagement() {
  // Existing account management UI
  return <div>Account Management</div>;
}
```

---

## 2. NEW: VideoMashupCreator Component

```jsx
/**
 * VideoMashupCreator.jsx
 * Step-by-step wizard for creating mashup videos
 * Flow: Upload→Template→Audio→Review→Queue→Monitor
 */

import React, { useState } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import GalleryPicker from '@/components/GalleryPicker';
import toast from 'react-hot-toast';
import { Upload, PlayCircle, Volume2, Eye, Zap } from 'lucide-react';

export function VideoMashupCreator() {
  const { addToQueue } = useVideoProductionStore();
  
  const [step, setStep] = useState(1); // 1-5
  const [loading, setLoading] = useState(false);
  
  // Step 1: Upload source video
  const [sourceVideo, setSourceVideo] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  
  // Step 2: Select template
  const [templateVideo, setTemplateVideo] = useState(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  
  // Step 3: Select audio
  const [audioTrack, setAudioTrack] = useState(null);
  const [showAudioGallery, setShowAudioGallery] = useState(false);
  const [audioMood, setAudioMood] = useState('upbeat');
  
  // Step 4: Settings
  const [config, setConfig] = useState({
    layout: 'side-by-side',
    duration: 30,
    platform: 'youtube',
    effects: ['fade-transition'],
    captionStyle: 'ai-generated'
  });
  
  // Step 5: Account selection
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [priority, setPriority] = useState('normal');

  // ===== STEP 1: Upload Source Video =====
  const handleUploadSource = async (file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('videoFile', file);
      formData.append('contentType', 'source');
      
      const response = await fetch('/api/media/upload-source', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const { data } = await response.json();
      setSourceVideo({
        mediaId: data.mediaId,
        name: file.name,
        duration: data.duration,
        size: file.size,
        thumbnail: data.thumbnail
      });
      setSourceFile(file);
      toast.success('Source video uploaded!');
      setStep(2);
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: Select Template =====
  const handleSelectTemplate = (template) => {
    setTemplateVideo({
      mediaId: template.mediaId,
      name: template.name,
      duration: template.duration,
      thumbnail: template.thumbnail
    });
    setShowTemplateGallery(false);
    toast.success('Template selected!');
    setStep(3);
  };

  // ===== STEP 3: Select Audio =====
  const handleSelectAudio = (audio) => {
    setAudioTrack({
      mediaId: audio.mediaId,
      name: audio.name,
      category: audio.category,
      duration: audio.duration
    });
    setShowAudioGallery(false);
    toast.success('Audio track selected!');
    setStep(4);
  };

  // ===== STEP 4: Review & Configure =====
  const handleReview = () => {
    if (!sourceVideo || !templateVideo || !audioTrack) {
      toast.error('Please select all required media');
      return;
    }
    setStep(5);
  };

  // ===== STEP 5: Queue Video =====
  const handleCreateMashup = async () => {
    try {
      setLoading(true);
      
      if (!selectedAccount) {
        toast.error('Please select an account');
        return;
      }

      const videoConfig = {
        layout: config.layout,
        duration: config.duration,
        platform: config.platform,
        sourceMediaId: sourceVideo.mediaId,
        templateMediaId: templateVideo.mediaId,
        audioMediaId: audioTrack.mediaId,
        effects: config.effects,
        captionStyle: config.captionStyle
      };

      const result = await addToQueue(
        videoConfig,
        config.platform,
        'hot_mashup',
        priority
      );

      toast.success(`Video queued! ID: ${result.queueItem.queueId}`);
      
      // Reset form
      setStep(1);
      setSourceVideo(null);
      setTemplateVideo(null);
      setAudioTrack(null);
      
    } catch (error) {
      toast.error(`Failed to create mashup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== UI RENDERING =====
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`flex-1 mx-1 h-2 rounded ${
                s <= step ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <div className="text-sm text-gray-400">
          Step {step} of 5: {
            step === 1 ? 'Upload Source Video' :
            step === 2 ? 'Select Template' :
            step === 3 ? 'Select Audio' :
            step === 4 ? 'Configure Settings' :
            'Select Account'
          }
        </div>
      </div>

      {/* Step 1: Upload Source */}
      {step === 1 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            Upload Source Video
          </h3>
          
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-400 transition cursor-pointer"
               onDragOver={(e) => e.preventDefault()}
               onDrop={(e) => {
                 e.preventDefault();
                 const file = e.dataTransfer.files[0];
                 if (file?.type.startsWith('video/')) {
                   handleUploadSource(file);
                 } else {
                   toast.error('Please upload a video file');
                 }
               }}>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && handleUploadSource(e.target.files[0])}
              className="hidden"
              id="source-upload"
            />
            <label htmlFor="source-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p className="font-semibold">Drag & drop your video here</p>
              <p className="text-sm text-gray-400 mt-1">or click to select file</p>
              <p className="text-xs text-gray-500 mt-2">Recommended: MP4, 20-60 seconds</p>
            </label>
          </div>

          {sourceVideo && (
            <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Preview</h4>
              <div className="flex gap-4">
                {sourceVideo.thumbnail && (
                  <img 
                    src={sourceVideo.thumbnail} 
                    alt="preview" 
                    className="w-32 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{sourceVideo.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Duration: {sourceVideo.duration}s
                  </p>
                  <p className="text-sm text-gray-400">
                    Size: {(sourceVideo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition font-semibold"
                disabled={loading}
              >
                Continue to Template Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-400" />
            Select Template Video
          </h3>
          
          <p className="text-gray-400 mb-4">
            Template will appear as 1/3 of screen. Main video (2/3).
          </p>

          <button
            onClick={() => setShowTemplateGallery(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-semibold transition mb-4"
          >
            Browse Template Gallery
          </button>

          {templateVideo && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Selected Template</h4>
              <div className="flex gap-4">
                <img 
                  src={templateVideo.thumbnail} 
                  alt={templateVideo.name}
                  className="w-32 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{templateVideo.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Duration: {templateVideo.duration}s
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition font-semibold"
                >
                  Continue to Audio
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Select Audio */}
      {step === 3 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-green-400" />
            Select Audio Track
          </h3>
          
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Audio Mood</label>
            <select
              value={audioMood}
              onChange={(e) => setAudioMood(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="upbeat">Upbeat</option>
              <option value="calm">Calm</option>
              <option value="trending">Trending</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <button
            onClick={() => setShowAudioGallery(true)}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition mb-4"
          >
            Browse Audio Library
          </button>

          {audioTrack && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Selected Audio</h4>
              <p className="font-medium">{audioTrack.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                Category: {audioTrack.category}
              </p>
              <p className="text-sm text-gray-400">
                Duration: {audioTrack.duration}s
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Configure Settings */}
      {step === 4 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-yellow-400" />
            Configure Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Layout</label>
              <select
                value={config.layout}
                onChange={(e) => setConfig({...config, layout: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="side-by-side">Side by Side (2/3 + 1/3)</option>
                <option value="pip">Picture in Picture</option>
                <option value="split-horizontal">Split Horizontal</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Duration (seconds)</label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                min="15"
                max="120"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Platform</label>
              <select
                value={config.platform}
                onChange={(e) => setConfig({...config, platform: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Caption Style</label>
              <select
                value={config.captionStyle}
                onChange={(e) => setConfig({...config, captionStyle: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="ai-generated">AI Generated</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          <div className="mt-6 p-3 bg-gray-700/50 rounded text-sm text-gray-300">
            <p><strong>Source:</strong> {sourceVideo?.name}</p>
            <p><strong>Template:</strong> {templateVideo?.name}</p>
            <p><strong>Audio:</strong> {audioTrack?.name}</p>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition font-semibold"
            >
              Select Account
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Select Account & Create */}
      {step === 5 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-400" />
            Account & Priority
          </h3>
          
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
            <h4 className="font-semibold mb-2 text-green-300">Ready to Create</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>✓ Source: {sourceVideo?.name}</li>
              <li>✓ Template: {templateVideo?.name}</li>
              <li>✓ Audio: {audioTrack?.name}</li>
              <li>✓ Layout: {config.layout}</li>
              <li>✓ Platform: {config.platform}</li>
              <li>✓ Priority: {priority}</li>
            </ul>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setStep(4)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleCreateMashup}
              className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Mashup'}
            </button>
          </div>
        </div>
      )}

      {/* Gallery Pickers */}
      <GalleryPicker
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelect={handleSelectTemplate}
        mediaType="template"
        contentType="video"
        title="Select Template Video"
      />

      <GalleryPicker
        isOpen={showAudioGallery}
        onClose={() => setShowAudioGallery(false)}
        onSelect={handleSelectAudio}
        mediaType="audio"
        contentType="audio"
        title="Select Audio Track"
      />
    </div>
  );
}

export default VideoMashupCreator;
```

---

## 3. NEW: ProcessingMonitor Component

```jsx
/**
 * ProcessingMonitor.jsx
 * Real-time monitoring of video processing
 */

import React, { useState, useEffect } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { Play, Pause, X, Download } from 'lucide-react';

export function ProcessingMonitor() {
  const { getNextPendingVideo } = useVideoProductionStore();
  
  const [currentJob, setCurrentJob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stages, setStages] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh || !currentJob) return;

    const interval = setInterval(() => {
      pollJobStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, currentJob]);

  const handleStartProcessing = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/video-production/workflow/process-next', {
        method: 'POST'
      });

      const { data } = await response.json();
      setCurrentJob(data.queueItem);
      setStages([]);
      
    } catch (error) {
      console.error('Failed to start processing:', error);
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(
        `/api/video-production/queue/${currentJob.queueId}`
      );

      const { data } = await response.json();
      setCurrentJob(data);

      // Parse stages from logs
      const logsResponse = await fetch(
        `/api/video-production/queue/${currentJob.queueId}/logs`
      );
      const { data: logs } = await logsResponse.json();
      
      if (logs.processLog?.stages) {
        setStages(logs.processLog.stages);
      }

      // Stop polling if done
      if (['ready', 'failed'].includes(data.status)) {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Poll failed:', error);
    }
  };

  const getStageStatus = (stageName) => {
    const stage = stages.find(s => s.stage === stageName);
    return stage?.status || 'pending';
  };

  const allStages = [
    { name: 'load-source', label: 'Load Source Video', icon: '🎬' },
    { name: 'load-template', label: 'Load Template', icon: '📹' },
    { name: 'load-audio', label: 'Load Audio', icon: '🎵' },
    { name: 'merge-videos', label: 'Merge Videos', icon: '🔗' },
    { name: 'add-audio', label: 'Add Audio Track', icon: '🔊' },
    { name: 'add-captions', label: 'Add Captions', icon: '📝' },
    { name: 'encode', label: 'Encode Video', icon: '⚙️' }
  ];

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Processing Monitor</h3>
        
        <div className="flex gap-2">
          <button
            onClick={handleStartProcessing}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Start Processing'}
          </button>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              autoRefresh
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Pause className="w-4 h-4" />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </button>
        </div>
      </div>

      {/* Current Job Status */}
      {currentJob && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Current Job</h3>
          
          {/* Status Badge */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-1">Status</p>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              currentJob.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
              currentJob.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
              currentJob.status === 'ready' ? 'bg-green-500/20 text-green-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {currentJob.status.toUpperCase()}
            </div>
          </div>

          {/* Processing Stages */}
          <div className="space-y-3">
            <p className="text-sm text-gray-400 font-semibold">Processing Stages</p>
            {allStages.map((stage, idx) => {
              const status = getStageStatus(stage.name);
              const stageData = stages.find(s => s.stage === stage.name);
              
              return (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="text-lg w-6">{stage.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{stage.label}</p>
                    {stageData && (
                      <p className="text-xs text-gray-500">
                        {(stageData.duration / 1000).toFixed(2)}s
                      </p>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    status === 'pending' ? 'bg-gray-700 text-gray-400' :
                    status === 'in_progress' ? 'bg-blue-700 text-blue-300' :
                    status === 'completed' ? 'bg-green-700 text-green-300' :
                    'bg-red-700 text-red-300'
                  }`}>
                    {status === 'in_progress' && '⏳ '}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generated Video */}
          {currentJob.videoPath && currentJob.status === 'ready' && (
            <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
              <h4 className="font-semibold text-green-300 mb-2">✓ Video Generated</h4>
              <p className="text-sm text-gray-300 break-all">{currentJob.videoPath}</p>
              <button className="mt-3 w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Video
              </button>
            </div>
          )}

          {/* Error Log */}
          {currentJob.errorLog?.length > 0 && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <h4 className="font-semibold text-red-300 mb-2">Errors</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                {currentJob.errorLog.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No Job Notice */}
      {!currentJob && !isProcessing && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
          <Play className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No active processing job</p>
          <p className="text-sm text-gray-500 mt-1">Click "Start Processing" to begin</p>
        </div>
      )}
    </div>
  );
}

export default ProcessingMonitor;
```

---

## 4. Enhanced Store Actions

```javascript
// frontend/src/stores/videoProductionStore.js - Add these methods

// ... existing store code ...

// NEW: Stream pipeline methods
generateAndUploadPipeline: async (videoConfig, platform, accountId) => {
  try {
    // 1. Add to queue
    const queueResult = await videoProductionApi.queue.add(
      videoConfig,
      platform,
      'hot_mashup'
    );
    
    // 2. Process immediately
    const processResult = await videoProductionApi.workflow.generate(
      'hot_mashup',
      platform,
      [accountId]
    );
    
    return {
      queueId: queueResult.queueId,
      uploadId: processResult.uploadId,
      success: true
    };
  } catch (error) {
    throw error;
  }
},

// Monitor real-time status
monitorQueueStatus: (queueId, onUpdate) => {
  const interval = setInterval(async () => {
    try {
      const item = await videoProductionApi.queue.getItem(queueId);
      onUpdate(item.data);
      
      if (['ready', 'failed'].includes(item.data.status)) {
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Monitor failed:', error);
    }
  }, 2000);
  
  return () => clearInterval(interval);
},

// Download generated video
downloadVideo: async (queueId) => {
  try {
    const item = await videoProductionApi.queue.getItem(queueId);
    if (!item.data.videoPath) {
      throw new Error('Video not ready');
    }
    
    const response = await fetch(
      `/api/video-production/queue/${queueId}/download`
    );
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mashup-${queueId}.mp4`;
    a.click();
  } catch (error) {
    throw error;
  }
}
```

---

## 5. Testing the Full Flow

```javascript
/**
 * Test flow: Upload → Queue → Process → Generate → Upload → Monitor
 */

// Test helper function
export async function testFullMashupFlow() {
  const videoProductionStore = useVideoProductionStore();
  
  try {
    console.log('🎬 Starting full mashup test flow...');
    
    // 1. Simulate file upload
    const sourceFile = new File(['video content'], 'test-source.mp4', { type: 'video/mp4' });
    console.log('📤 Step 1: Upload source video');
    
    // (In real scenario, this happens via UI)
    
    // 2. Select template
    console.log('📹 Step 2: Select template');
    const template = await fetch('/api/video-production/media/random/template?platform=youtube');
    const { data: templateData } = await template.json();
    
    // 3. Select audio
    console.log('🎵 Step 3: Select audio');
    const audio = await fetch('/api/video-production/media/random/audio?mood=upbeat');
    const { data: audioData } = await audio.json();
    
    // 4. Create queue item
    console.log('📋 Step 4: Create queue item');
    const queueResult = await videoProductionStore.addToQueue(
      {
        layout: 'side-by-side',
        duration: 30,
        sourceMediaId: 'test-source-id',
        templateMediaId: templateData.mediaId,
        audioMediaId: audioData.mediaId
      },
      'youtube',
      'hot_mashup'
    );
    
    const queueId = queueResult.queueItem.queueId;
    console.log(`✅ Queue item created: ${queueId}`);
    
    // 5. Process video
    console.log('⚙️ Step 5: Start processing');
    await fetch('/api/video-production/workflow/process-next', {
      method: 'POST'
    });
    
    // 6. Monitor processing
    console.log('👁️ Step 6: Monitor progress');
    const monitoring = videoProductionStore.monitorQueueStatus(
      queueId,
      (status) => {
        console.log(`Processing: ${status.status}`);
        if (status.videoPath) {
          console.log(`📍 Output path: ${status.videoPath}`);
        }
      }
    );
    
    // Wait for completion
    await new Promise(resolve => {
      const checkInterval = setInterval(async () => {
        const item = await fetch(`/api/video-production/queue/${queueId}`);
        const { data } = await item.json();
        if (data.status === 'ready') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 2000);
    });
    
    // 7. Register upload
    console.log('📤 Step 7: Register upload');
    const finalQueue = await fetch(`/api/video-production/queue/${queueId}`);
    const { data: queueData } = await finalQueue.json();
    
    const uploadResult = await videoProductionStore.registerUpload(
      queueId,
      queueData.videoPath,
      'youtube',
      'acc-youtube-001'
    );
    
    console.log(`✅ Upload registered: ${uploadResult.uploadId}`);
    console.log('🎉 Full flow completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
```

---

## 🚀 Implementation Checklist

- [ ] Create `VideoMashupCreator.jsx` with full wizard
- [ ] Create `ProcessingMonitor.jsx` with real-time tracking
- [ ] Create `MediaLibraryBrowser.jsx` for template/audio selection
- [ ] Create `CronJobManager.jsx` for automation
- [ ] Update `VideoProduction.jsx` with new tabs
- [ ] Add methods to `videoProductionStore.js`
- [ ] Implement WebSocket/polling for real-time updates
- [ ] Add video download functionality
- [ ] Add error handling and retry logic
- [ ] Test full end-to-end flow
- [ ] Add drag-n-drop file upload
- [ ] Implement progress indicators

---

**Ready to implement?** Start with VideoMashupCreator for users to create videos, then ProcessingMonitor to track execution.
