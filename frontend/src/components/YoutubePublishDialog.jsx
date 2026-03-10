import React, { useState, useEffect } from 'react';
import { Loader2, Youtube, AlertCircle, CheckCircle2 } from 'lucide-react';
import videoPipelineApi from '../services/videoPipelineApi';
import ModalPortal from './ModalPortal';

export default function YoutubePublishDialog({ isOpen, queueId, onClose, onPublish, videoTitle }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await videoPipelineApi.getPublishAccounts();
      
      if (result.success) {
        // Filter only YouTube OAuth accounts
        const youtubeOAuthAccounts = result.accounts.filter(
          acc => acc.platform === 'youtube' && acc.source === 'oauth'
        );
        setAccounts(youtubeOAuthAccounts);
      } else {
        setError(result.error || 'Failed to load accounts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccount = (accountId) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handlePublish = async () => {
    if (selectedAccounts.length === 0) {
      setError('Please select at least one YouTube account');
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);
      setPublishResults(null);

      const result = await videoPipelineApi.publishToYoutubeAccounts(queueId, {
        accountIds: selectedAccounts,
        videoMetadata: {
          title: videoTitle,
          visibility: 'public'
        }
      });

      setPublishResults(result);
      
      if (result.success) {
        if (onPublish) {
          onPublish(result);
        }
      } else {
        setError(result.error || 'Publishing failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 space-y-4 border border-slate-700">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Youtube className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-white">Publish to YouTube</h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          </div>
        )}

        {/* Accounts List */}
        {!isLoading && !publishResults && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Select YouTube channels to publish to:</p>
            
            {accounts.length === 0 ? (
              <div className="p-4 bg-slate-700/50 rounded-lg text-center text-slate-400 text-sm">
                No YouTube accounts connected. Please connect a YouTube account first.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {accounts.map(account => (
                  <label
                    key={account.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 cursor-pointer transition-colors border border-slate-600/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => toggleAccount(account.id)}
                      className="mt-1 w-4 h-4 rounded border-slate-400 bg-slate-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{account.displayName}</p>
                      <p className="text-xs text-slate-400">@{account.username}</p>
                      {account.stats?.totalUploads > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {account.stats.totalUploads} uploads
                        </p>
                      )}
                    </div>
                    {account.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Publish Results */}
        {publishResults && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">
              {publishResults.successful}/{selectedAccounts.length} published successfully
            </p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {publishResults.results?.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-medium text-white text-sm">
                      {result.username}
                    </span>
                  </div>
                  {result.success && result.videoUrl && (
                    <a
                      href={result.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 break-all"
                    >
                      {result.videoUrl}
                    </a>
                  )}
                  {!result.success && (
                    <p className="text-xs text-red-300">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {publishResults ? 'Close' : 'Cancel'}
          </button>
          
          {!publishResults && (
            <button
              onClick={handlePublish}
              disabled={
                isLoading || isPublishing || selectedAccounts.length === 0 || accounts.length === 0
              }
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Youtube className="w-4 h-4" />
                  Publish Now
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}


