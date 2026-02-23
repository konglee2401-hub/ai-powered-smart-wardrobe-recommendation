/**
 * VideoMashupCreator.jsx
 * Step-by-step wizard for creating mashup videos
 * Upload main video → Select sub-video → Configure → Queue
 */

import React, { useState, useRef } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import GalleryPicker from '@/components/GalleryPicker';
import toast from 'react-hot-toast';
import { Upload, Play, Volume2, Settings, HardDrive, ArrowRight, Check } from 'lucide-react';

export function VideoMashupCreator() {
  const { addToQueue } = useVideoProductionStore();
  
  const [step, setStep] = useState(1); // 1-4
  const [loading, setLoading] = useState(false);
  
  // Step 1: Upload main video
  const [mainVideo, setMainVideo] = useState(null);
  const fileInputRef = useRef(null);
  
  // Step 2: Select sub-video
  const [subVideo, setSubVideo] = useState(null);
  const [showSubVideoGallery, setShowSubVideoGallery] = useState(false);
  
  // Step 3: Settings
  const [config, setConfig] = useState({
    layout: '2-3-1-3', // 2/3 main + 1/3 sub
    duration: 30,
    platform: 'youtube',
    aspectRatio: '9:16', // YouTube Shorts
    quality: 'high'
  });
  
  // Step 4: Confirm & Queue
  const [queuedItem, setQueuedItem] = useState(null);

  // ===== STEP 1: Upload Main Video =====
  const handleUploadMain = async (file) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('videoFile', file);
      formData.append('contentType', 'main');
      
      const response = await fetch('/api/media/upload-source', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setMainVideo({
        mediaId: data.mediaId,
        name: file.name,
        duration: data.duration || 30,
        size: file.size,
        thumbnail: data.thumbnail || 'https://via.placeholder.com/120x90?text=Video'
      });
      toast.success('Main video uploaded!');
      setStep(2);
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: Select Sub-Video =====
  const handleSelectSubVideo = (video) => {
    setSubVideo({
      mediaId: video.mediaId || video.id,
      name: video.name || video.title,
      duration: video.duration || 30,
      thumbnail: video.thumbnail || 'https://via.placeholder.com/120x90?text=Video'
    });
    setShowSubVideoGallery(false);
    toast.success('Sub-video selected!');
    setStep(3);
  };

  // ===== STEP 3: Configure =====
  const handleConfigure = () => {
    if (!mainVideo || !subVideo) {
      toast.error('Please select both videos');
      return;
    }
    setStep(4);
  };

  // ===== STEP 4: Queue Video =====
  const handleCreateMashup = async () => {
    try {
      setLoading(true);

      const videoConfig = {
        layout: config.layout,
        duration: config.duration,
        platform: config.platform,
        aspectRatio: config.aspectRatio,
        quality: config.quality,
        mainMediaId: mainVideo.mediaId,
        subMediaId: subVideo.mediaId
      };

      const result = await addToQueue(videoConfig, config.platform, 'mashup', 'high');

      toast.success(`Video queued! ID: ${result.queueItem.queueId}`);
      setQueuedItem(result.queueItem);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setStep(1);
        setMainVideo(null);
        setSubVideo(null);
        setQueuedItem(null);
      }, 2000);
      
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
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between mb-3">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`flex-1 h-2 rounded transition ${
                s <= step ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'
              }`} />
              {s < 4 && <ArrowRight className={`w-4 h-4 mx-2 ${s <= step ? 'text-purple-400' : 'text-gray-600'}`} />}
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-400 font-semibold">
          Step {step} of 4: {
            step === 1 ? 'Upload Main Video (2/3)' :
            step === 2 ? 'Select Sub-Video (1/3)' :
            step === 3 ? 'Configure Settings' :
            'Review & Create'
          }
        </div>
      </div>

      {/* Step 1: Upload Main Video */}
      {step === 1 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/50 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            Upload Main Video (2/3 of screen)
          </h3>
          
          <div 
            className="border-2 border-dashed border-purple-400 rounded-lg p-8 text-center hover:border-purple-300 hover:bg-purple-500/5 transition cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleUploadMain(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && handleUploadMain(e.target.files[0])}
              className="hidden"
            />
            <label 
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer"
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-purple-400" />
              <p className="font-semibold text-white">Drag & drop main video here</p>
              <p className="text-sm text-gray-400 mt-1">or click to select file</p>
              <p className="text-xs text-gray-500 mt-2">Recommended: MP4, 15-60 seconds</p>
            </label>
          </div>

          {mainVideo && (
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> Main Video Ready
              </h4>
              <div className="flex gap-4">
                <img 
                  src={mainVideo.thumbnail} 
                  alt="preview" 
                  className="w-32 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium text-white">{mainVideo.name}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Duration: {mainVideo.duration}s
                  </p>
                  <p className="text-sm text-gray-400">
                    Size: {(mainVideo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
                disabled={loading}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Sub-Video */}
      {step === 2 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/50 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" />
            Select Sub-Video (1/3 of screen, right side)
          </h3>
          
          <p className="text-gray-400 text-sm">
            Choose a video that will appear on the right side of your main video
          </p>

          <button
            onClick={() => setShowSubVideoGallery(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <HardDrive className="w-5 h-5" />
            Browse Local Videos
          </button>

          {subVideo && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> Sub-Video Selected
              </h4>
              <div className="flex gap-4">
                <img 
                  src={subVideo.thumbnail} 
                  alt={subVideo.name}
                  className="w-32 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium text-white">{subVideo.name}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Duration: {subVideo.duration}s
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Configure Settings */}
      {step === 3 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-green-500/50 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-400" />
            Configure Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-semibold">Duration (seconds)</label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                min="15"
                max="120"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block font-semibold">Platform</label>
              <select
                value={config.platform}
                onChange={(e) => setConfig({...config, platform: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              >
                <option value="youtube">YouTube Shorts (9:16)</option>
                <option value="tiktok">TikTok (9:16)</option>
                <option value="instagram">Instagram Reels (9:16)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block font-semibold">Quality</label>
              <select
                value={config.quality}
                onChange={(e) => setConfig({...config, quality: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              >
                <option value="standard">Standard (720p)</option>
                <option value="high">High (1080p)</option>
                <option value="4k">Ultra (4K)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block font-semibold">Layout</label>
              <div className="text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded px-3 py-2">
                Main 2/3 + Sub 1/3
              </div>
            </div>
          </div>

          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-green-300 mb-2">Preview Layout</h4>
            <div className="flex gap-2 h-24">
              <div className="flex-[2] bg-gray-700 rounded-lg border-2 border-green-500 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Main Video (2/3)</p>
                  <p className="text-sm font-semibold text-gray-300">{mainVideo?.name}</p>
                </div>
              </div>
              <div className="flex-1 bg-gray-700 rounded-lg border-2 border-blue-500 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Sub (1/3)</p>
                  <p className="text-xs font-semibold text-gray-300">{subVideo?.name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleConfigure}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-pink-500/50 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Check className="w-5 h-5 text-pink-400" />
            Review & Create Mashup
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 font-semibold mb-1">Main Video (2/3)</p>
              <img 
                src={mainVideo?.thumbnail} 
                alt="main"
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
              <p className="text-sm font-medium text-white truncate">{mainVideo?.name}</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 font-semibold mb-1">Sub Video (1/3)</p>
              <img 
                src={subVideo?.thumbnail} 
                alt="sub"
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
              <p className="text-sm font-medium text-white truncate">{subVideo?.name}</p>
            </div>
          </div>

          <div className="bg-pink-900/30 border border-pink-500/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-pink-300">Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div><span className="text-gray-400">Duration:</span> {config.duration}s</div>
              <div><span className="text-gray-400">Platform:</span> {config.platform}</div>
              <div><span className="text-gray-400">Quality:</span> {config.quality}</div>
              <div><span className="text-gray-400">Layout:</span> 2/3 + 1/3</div>
            </div>
          </div>

          {queuedItem && (
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <h4 className="font-semibold text-green-300 mb-1">✓ Successfully Queued!</h4>
              <p className="text-sm text-gray-300">Queue ID: {queuedItem.queueId}</p>
              <p className="text-xs text-gray-400 mt-1">Video is ready for processing</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition font-semibold"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleCreateMashup}
              className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 px-4 py-2 rounded-lg transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : '✓ Create Mashup'}
            </button>
          </div>
        </div>
      )}

      {/* Sub-Video Gallery */}
      <GalleryPicker
        isOpen={showSubVideoGallery}
        onClose={() => setShowSubVideoGallery(false)}
        onSelect={handleSelectSubVideo}
        mediaType="video"
        contentType="video"
        title="Select Sub-Video"
      />
    </div>
  );
}

export default VideoMashupCreator;
