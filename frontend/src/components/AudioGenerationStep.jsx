/**
 * Step 3: Audio Generation Component
 * Generates TTS audio from script and provides preview/download options
 */

import React, { useState, useRef } from 'react';
import { Music, Loader2, Play, Pause, Download, Volume2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import ttsAPI from '../services/ttsService';

export default function AudioGenerationStep({
  script = '',
  voiceName = '',
  language = 'VI',
  onAudioGenerated,
  onComplete,
  isLoading = false,
  generatedAudio = null,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(generatedAudio?.url || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(null);
  const audioRef = useRef(null);

  // Estimate duration on mount
  React.useEffect(() => {
    if (script && !estimatedDuration) {
      estimateDuration();
    }
  }, [script]);

  const estimateDuration = async () => {
    try {
      const response = await ttsAPI.estimateDuration(script);
      setEstimatedDuration(response.duration);
    } catch (error) {
      console.error('Duration estimation error:', error);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script.trim()) {
      toast.error('Script is empty');
      return;
    }

    if (!voiceName) {
      toast.error('Please select a voice');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate audio and save on backend
      const response = await ttsAPI.generateAndSaveAudio(
        script,
        voiceName,
        `voiceover_${Date.now()}.wav`,
        { language }
      );

      if (response.success) {
        const audioUrl = ttsAPI.streamAudio(response.fileName);
        setAudioUrl(audioUrl);
        onAudioGenerated({
          url: audioUrl,
          fileName: response.fileName,
          filePath: response.filePath,
        });
        toast.success('Audio generated successfully!');
      } else {
        throw new Error(response.error || 'Failed to generate audio');
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      toast.error(error.message || 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) {
      toast.error('No audio to download');
      return;
    }

    try {
      const fileName = `voiceover_${Date.now()}.wav`;
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Audio downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download audio');
    }
  };

  const isAudioReady = audioUrl && audioUrl.length > 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Music className="w-5 h-5 text-amber-400" />
          Step 3: Generate Audio
        </h3>
        <p className="text-sm text-gray-400">
          Convert your script to professional voiceover using Google Gemini TTS.
        </p>
      </div>

      {/* Script Preview */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-300">Script Summary</label>
        <div className="p-4 rounded-lg bg-gray-700/30 border border-gray-600 max-h-24 overflow-y-auto">
          <p className="text-sm text-gray-300 leading-relaxed">{script}</p>
        </div>
      </div>

      {/* Voice & Settings Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/50">
          <div className="text-xs text-gray-400 mb-1">Selected Voice</div>
          <div className="text-sm font-bold text-amber-300">{voiceName}</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <div className="text-xs text-gray-400 mb-1">Language</div>
          <div className="text-sm font-bold text-blue-300">
            {language === 'VI' ? 'Tiếng Việt' : 'English'}
          </div>
        </div>
      </div>

      {/* Duration Estimate */}
      {estimatedDuration && (
        <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50">
          <div className="text-xs text-gray-400 mb-1">Estimated Duration</div>
          <div className="text-lg font-bold text-purple-300">{estimatedDuration}s</div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerateAudio}
        disabled={isGenerating || !script.trim()}
        className={`w-full px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-white ${
          isGenerating || !script.trim()
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Audio...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Voiceover
          </>
        )}
      </button>

      {/* Audio Player */}
      {audioUrl && (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-300">Preview</label>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600 space-y-3">
            {/* Player Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="p-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1">
                <div className="text-sm text-gray-300">
                  {isPlaying ? 'Playing...' : 'Click to preview your voiceover'}
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="p-3 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>

            {/* Audio Info */}
            <div className="text-xs text-gray-400 text-center">
              Your voiceover is ready to download or use for further editing
            </div>
          </div>
        </div>
      )}

      {/* Complete Button */}
      {isAudioReady && (
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <button
            onClick={onComplete}
            className="px-8 py-2 rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white transition-all flex items-center gap-2"
          >
            <Music className="w-4 h-4" />
            Complete
          </button>
        </div>
      )}
    </div>
  );
}
