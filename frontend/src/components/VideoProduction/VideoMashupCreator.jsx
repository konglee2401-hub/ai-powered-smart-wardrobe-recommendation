/**
 * VideoMashupCreator.jsx
 * Step-by-step wizard for creating mashup videos
 * Upload main video → Select sub-video → Configure → Queue
 */

import React, { useState, useRef } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import GalleryPicker from '@/components/GalleryPicker';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/config/api.js';
import { Upload, Play, Settings, HardDrive, ArrowRight, Check } from 'lucide-react';


export function VideoMashupCreator() {
  const { addToQueue } = useVideoProductionStore();
  
  const [step, setStep] = useState(1); // 1-3

  const [loading, setLoading] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);

  
  // Step 1: Upload main video
  const [mainVideo, setMainVideo] = useState(null);
  const fileInputRef = useRef(null);
  
  // Step 1: Select main + sub videos
  const [subVideo, setSubVideo] = useState(null);
  const [showMainVideoGallery, setShowMainVideoGallery] = useState(false);
  const [showSubVideoGallery, setShowSubVideoGallery] = useState(false);
  
  // Step 2: Settings

  const [config, setConfig] = useState({
    layout: '2-3-1-3', // 2/3 main + 1/3 sub
    duration: 30,
    platform: 'youtube',
    aspectRatio: '9:16', // YouTube Shorts
    quality: 'high'
  });
  
  // Step 3: Confirm & Queue
  const [queuedItem, setQueuedItem] = useState(null);


  const normalizeGalleryVideo = (video) => {
    if (!video) return null;

    const mediaId = video.assetId || video.mediaId || video.id;
    const name = video.name;
    const thumbnail = video.thumbnail || video.url || 'https://via.placeholder.com/120x90?text=Video';

    if (!mediaId || !name) return null;

    return {
      mediaId,
      name,
      duration: video.duration || 30,
      size: video.size,
      thumbnail,
      source: 'gallery'
    };
  };

  // ===== STEP 1: Upload Main Video =====
  const handleUploadMain = async (file) => {
    if (!file || !file.type || !file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    try {
      setLoading(true);
      setUploadingMain(true);

      const apiUrl = API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'video');
      formData.append('tags', 'source-video,mashup-main');

      const uploadResponse = await fetch(`${apiUrl}/drive/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      const uploadJson = await uploadResponse.json();
      if (!uploadJson.success) {
        throw new Error(uploadJson.message || 'Drive upload failed');
      }

      const uploadedFile = uploadJson.file || uploadJson.data || uploadJson;
      if (!uploadedFile?.id) {
        throw new Error('Uploaded file ID is missing');
      }

      const uploadSource = String(uploadedFile.source || '').toLowerCase();
      const isDriveFile = uploadSource === 'google-drive' || Boolean(uploadedFile.webViewLink || uploadedFile.webContentLink);

      const assetPayload = {
        filename: uploadedFile.name || file.name,
        mimeType: uploadedFile.mimeType || file.type,
        fileSize: uploadedFile.size || file.size,
        assetType: 'video',
        assetCategory: 'source-video',
        userId: 'anonymous',
        storage: {
          location: isDriveFile ? 'google-drive' : 'local',
          googleDriveId: isDriveFile ? uploadedFile.id : undefined,
          googleDrivePath: isDriveFile ? 'Affiliate AI/Videos/Uploaded/App' : undefined,
          url: uploadedFile.webViewLink || uploadedFile.webContentLink || uploadedFile.url || null
        },
        cloudStorage: isDriveFile
          ? {
              location: 'google-drive',
              googleDriveId: uploadedFile.id,
              webViewLink: uploadedFile.webViewLink || uploadedFile.webContentLink || null,
              thumbnailLink: uploadedFile.thumbnailLink || null,
              status: 'synced'
            }
          : undefined,
        metadata: {
          uploadedVia: 'video-mashup-creator'
        },
        tags: ['source-video', 'mashup-main'],
        autoReplace: true
      };

      const assetResponse = await fetch(`${apiUrl}/assets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assetPayload)
      });

      if (!assetResponse.ok) {
        throw new Error(`Asset creation failed with status ${assetResponse.status}`);
      }

      const assetJson = await assetResponse.json();
      if (!assetJson.success || !assetJson.asset?.assetId) {
        throw new Error(assetJson.error || 'Asset creation failed');
      }

      const createdAsset = assetJson.asset;

      setMainVideo({
        mediaId: createdAsset.assetId,
        name: createdAsset.filename || file.name,
        duration: 30,
        size: createdAsset.fileSize || file.size,
        thumbnail: `${apiUrl}/assets/proxy/${createdAsset.assetId}`,
        source: 'upload'
      });

      toast.success('Main video uploaded and saved to gallery!');

    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploadingMain(false);
      setLoading(false);
    }
  };


  const handleSelectMainVideo = (video) => {
    const normalized = normalizeGalleryVideo(video);

    if (!normalized) {
      toast.error('Selected main video is missing required fields');
      return;
    }

    setMainVideo(normalized);
    setShowMainVideoGallery(false);
    toast.success('Main video selected from gallery!');

  };

  // ===== STEP 2: Select Sub-Video =====
  const handleSelectSubVideo = (video) => {
    const normalized = normalizeGalleryVideo(video);

    if (!normalized) {
      toast.error('Selected sub-video is missing required fields');
      return;
    }

    setSubVideo(normalized);
    setShowSubVideoGallery(false);
    toast.success('Sub-video selected!');

  };


  // ===== STEP 3: Configure =====
  const handleConfigure = () => {
    if (!mainVideo || !subVideo) {
      toast.error('Please select both videos');
      return;
    }
    setStep(3);

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
  const steps = [
    { id: 1, title: 'Videos', subtitle: 'Chọn cả main + sub video' },
    { id: 2, title: 'Settings', subtitle: 'Cấu hình mashup' },
    { id: 3, title: 'Review', subtitle: 'Xác nhận và queue' }
  ];


  return (
    <div className="space-y-6">
      <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((item) => {
            const completed = step > item.id;
            const active = step === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-lg border p-3 transition ${
                  active
                    ? 'border-purple-500 bg-purple-500/10'
                    : completed
                      ? 'border-green-500/40 bg-green-500/10'
                      : 'border-gray-700 bg-gray-900/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      completed
                        ? 'bg-green-500 text-black'
                        : active
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {completed ? '✓' : item.id}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-6 items-start" style={{ minWidth: '980px' }}>
          <div className="space-y-4 order-2 flex-1 min-w-0">
          {step === 1 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-purple-500/40 space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Upload className="w-5 h-5 text-purple-400" />
                Chọn 2 video đầu vào (Main + Sub)
              </h3>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-lg border border-purple-500/40 bg-purple-900/10 p-4">
                  <h4 className="font-semibold text-white">Main Video (2/3)</h4>

                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition ${
                      uploadingMain
                        ? 'border-purple-300 bg-purple-500/10'
                        : 'border-purple-400 hover:border-purple-300 hover:bg-purple-500/5 cursor-pointer'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (uploadingMain) return;
                      const file = e.dataTransfer.files[0];
                      if (file) handleUploadMain(file);
                    }}
                  >
                    {uploadingMain && (
                      <div className="absolute inset-0 bg-gray-900/80 rounded-lg flex flex-col items-center justify-center z-10">
                        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-purple-200 font-semibold">Đang upload và tạo asset...</p>
                        <p className="text-xs text-gray-400 mt-1">Vui lòng chờ, không tắt tab</p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMain(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                      disabled={uploadingMain}
                    />
                    <label
                      onClick={() => !uploadingMain && fileInputRef.current?.click()}
                      className={uploadingMain ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                    >
                      <Upload className="w-10 h-10 mx-auto mb-2 text-purple-400" />
                      <p className="font-semibold text-white">Upload video mới</p>
                      <p className="text-xs text-gray-400 mt-1">Kéo thả hoặc click để chọn file</p>
                    </label>
                  </div>

                  <button
                    onClick={() => setShowMainVideoGallery(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                    disabled={uploadingMain}
                  >
                    <HardDrive className="w-5 h-5" />
                    Chọn Main từ Gallery
                  </button>

                  {mainVideo && (
                    <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-white break-all">{mainVideo.name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-blue-500/40 bg-blue-900/10 p-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-blue-400" />
                    Sub Video (1/3)
                  </h4>

                  <p className="text-xs text-gray-400">Chọn từ gallery để dùng lại asset có sẵn.</p>

                  <button
                    onClick={() => setShowSubVideoGallery(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <HardDrive className="w-5 h-5" />
                    Chọn Sub từ Gallery
                  </button>

                  {subVideo && (
                    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-white break-all">{subVideo.name}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={!mainVideo || !subVideo || uploadingMain}
              >
                Tiếp tục tới Settings <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}


          {step === 2 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-green-500/40 space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Settings className="w-5 h-5 text-green-400" />
                Configure Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-semibold">Duration (seconds)</label>
                  <input
                    type="number"
                    value={config.duration}
                    onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                    min="15"
                    max="120"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-semibold">Platform</label>
                  <select
                    value={config.platform}
                    onChange={(e) => setConfig({ ...config, platform: e.target.value })}
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
                    onChange={(e) => setConfig({ ...config, quality: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="standard">Standard (720p)</option>
                    <option value="high">High (1080p)</option>
                    <option value="4k">Ultra (4K)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-semibold">Layout</label>
                  <div className="text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded px-3 py-2">Main 2/3 + Sub 1/3</div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(1)}
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

          {step === 3 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-pink-500/40 space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Check className="w-5 h-5 text-pink-400" />
                Review & Create Mashup
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Main Video</p>
                  <img src={mainVideo?.thumbnail} alt="main" className="w-full h-24 object-cover rounded-lg mb-2" />
                  <p className="text-sm font-medium text-white truncate">{mainVideo?.name}</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Sub Video</p>
                  <img src={subVideo?.thumbnail} alt="sub" className="w-full h-24 object-cover rounded-lg mb-2" />
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
                  onClick={() => setStep(2)}
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
        </div>

        <aside className="order-1 w-80 shrink-0 space-y-4 max-h-[calc(100vh-6rem)] overflow-auto">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
            <h4 className="text-white font-semibold">Thông tin đã chọn</h4>

            <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
              <p className="text-xs text-gray-400 mb-2">Main Video</p>
              {mainVideo ? (
                <div className="space-y-2">
                  <img src={mainVideo.thumbnail} alt={mainVideo.name} className="w-full h-24 object-cover rounded" />
                  <p className="text-sm text-white break-all">{mainVideo.name}</p>
                  <span className="inline-flex text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                    {mainVideo.source === 'upload' ? 'Uploaded mới' : 'Từ Gallery'}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chưa chọn main video</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
              <p className="text-xs text-gray-400 mb-2">Sub Video</p>
              {subVideo ? (
                <div className="space-y-2">
                  <img src={subVideo.thumbnail} alt={subVideo.name} className="w-full h-24 object-cover rounded" />
                  <p className="text-sm text-white break-all">{subVideo.name}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chưa chọn sub video</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3 text-sm text-gray-300">
              <p className="text-xs text-gray-400 mb-2">Config hiện tại</p>
              <p>Duration: {config.duration}s</p>
              <p>Platform: {config.platform}</p>
              <p>Quality: {config.quality}</p>
            </div>
          </div>
          </aside>
        </div>
      </div>

      <GalleryPicker
        isOpen={showMainVideoGallery}
        onClose={() => setShowMainVideoGallery(false)}
        onSelect={handleSelectMainVideo}
        assetType="video"
        title="Select Main Video"
      />

      <GalleryPicker
        isOpen={showSubVideoGallery}
        onClose={() => setShowSubVideoGallery(false)}
        onSelect={handleSelectSubVideo}
        assetType="video"
        title="Select Sub-Video"
      />
    </div>
  );
}

export default VideoMashupCreator;
