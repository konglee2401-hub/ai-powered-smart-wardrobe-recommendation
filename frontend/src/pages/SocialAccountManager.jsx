import React, { useState, useEffect } from 'react';
import {
  Globe,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Clock,
  Users,
  Youtube,
  ChevronRight,
  Search
} from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import ModalPortal from '../components/ModalPortal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Social Account Manager Component - Redesigned with Design System
 * Manages YouTube and other social media account connections
 */
export default function SocialAccountManager() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [message, setMessage] = useState(null);

  // Load accounts on mount
  useEffect(() => {
    console.log('ðŸ“± Loading YouTube channels...');
    loadAccounts();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const accountId = params.get('accountId');
    const channelTitle = params.get('channelTitle');
    const oauthError = params.get('error');

    if (connected === 'youtube' && accountId) {
      const message = channelTitle 
        ? `YouTube channel "${decodeURIComponent(channelTitle)}" connected successfully!`
        : `YouTube account connected successfully!`;
      showNotification('success', message);
      loadAccounts();
      setConnectingPlatform(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (oauthError) {
      const errorMessages = {
        'access_denied': 'You cancelled the OAuth consent',
        'missing_code': 'OAuth code is missing',
        'oauth_failed': 'Failed to process OAuth request',
        'callback_error': 'Error during OAuth callback',
      };
      const errorMsg = errorMessages[oauthError] || oauthError;
      showNotification('error', `Connection failed: ${errorMsg}`);
      setConnectingPlatform(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/social-media?platform=youtube`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('ðŸ“Š Channels response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('âŒ Error response:', errorData);
        throw new Error(errorData.error || errorData.message || `Failed to load channels (${response.status})`);
      }
      
      const data = await response.json();
      setAccounts(data.accounts || []);
      console.log(`âœ… Loaded ${data.total || 0} YouTube channels`);
    } catch (err) {
      setError(err.message);
      console.error('Error loading accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectYoutube = async () => {
    try {
      setConnectingPlatform('youtube');
      const response = await fetch(`${API_URL}/shorts-reels/youtube/oauth/start`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get OAuth URL');
      }
      
      if (data.authUrl) {
        console.log('ðŸ” Opening OAuth in new tab...');
        window.open(data.authUrl, '_blank', 'width=500,height=600');
      } else {
        throw new Error('No OAuth URL returned');
      }
    } catch (err) {
      showNotification('error', `Connection failed: ${err.message}`);
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!selectedForDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`${API_URL}/social-media/youtube/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to disconnect account');

      showNotification('success', 'Account disconnected successfully');
      setSelectedForDelete(null);
      loadAccounts();
    } catch (err) {
      showNotification('error', `Failed to disconnect: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (type, message) => {
    setMessage({ type, text: message });
    setTimeout(() => setMessage(null), 4000);
  };

  const getStatusPill = (account) => {
    if (!account.isActive) {
      return {
        tone: 'violet',
        label: 'Inactive',
        icon: <XCircle className="w-3 h-3" />
      };
    }

    if (!account.isVerified) {
      return {
        tone: 'amber',
        label: 'Unverified',
        icon: <AlertCircle className="w-3 h-3" />
      };
    }

    return {
      tone: 'emerald',
      label: 'Connected',
      icon: <CheckCircle2 className="w-3 h-3" />
    };
  };

  const youtubeAccounts = accounts.filter(acc => acc.platform === 'youtube');

  const getStatusPillClasses = (tone) => {
    const toneMap = {
      emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200',
      amber: 'bg-amber-500/20 border-amber-500/50 text-amber-200',
      violet: 'bg-violet-500/20 border-violet-500/50 text-violet-200',
      sky: 'bg-sky-500/20 border-sky-500/50 text-sky-200',
    };
    return toneMap[tone] || toneMap.sky;
  };

  return (
    <div className="page-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden lg:-mx-6 lg:-mb-6 lg:-mt-6">
      {/* Header */}
      <PageHeaderBar 
        icon={<Globe className="h-4 w-4 text-sky-400" />}
        title="Social Media Accounts"
        meta="Connect and manage your social media accounts for automated publishing"
        className="h-16"
      />

      {/* Content */}
      <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
          
          {/* Message Toast */}
          {message && (
            <div className={`rounded-2xl border px-4 py-3 text-sm transition ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-200'
            }`}>
              {message.type === 'success' ? 'âœ…' : 'âŒ'} {message.text}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-violet-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-200">Error loading accounts</p>
                <p className="text-xs text-violet-200/70 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* YouTube Section */}
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-rose-500/20 p-2">
                  <Youtube className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">YouTube Channels</h2>
                  <p className="mt-1 text-xs text-slate-400">Connect your YouTube channels for video publishing</p>
                </div>
              </div>
              <button
                onClick={handleConnectYoutube}
                disabled={connectingPlatform === 'youtube'}
                className="flex items-center gap-2 rounded-xl border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/30 disabled:opacity-50"
              >
                {connectingPlatform === 'youtube' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Connect Channel
                  </>
                )}
              </button>
            </div>

            {/* Accounts List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 py-12">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading YouTube channels...</p>
                  </div>
                </div>
              ) : youtubeAccounts.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-12 text-center">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-300">No YouTube accounts connected yet</p>
                  <p className="mt-1 text-xs text-slate-400">Click "Connect Channel" to link your first YouTube account</p>
                </div>
              ) : (
                youtubeAccounts.map(account => (
                  <AccountCard
                    key={account._id}
                    account={account}
                    onDelete={() => setSelectedForDelete(account._id)}
                    statusPill={getStatusPill(account)}
                    getStatusPillClasses={getStatusPillClasses}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {selectedForDelete && (
        <DeleteConfirmationModal
          accountId={selectedForDelete}
          isDeleting={isDeleting}
          onConfirm={() => handleDisconnect(selectedForDelete)}
          onCancel={() => setSelectedForDelete(null)}
        />
      )}
    </div>
  );
}

/**
 * Account Card Component
 */
function AccountCard({ account, onDelete, statusPill, getStatusPillClasses }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 transition hover:border-slate-700">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-2xl bg-rose-500/20 p-2">
              <Youtube className="h-5 w-5 text-rose-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-100">
                {account.displayName || account.username}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">@{account.username}</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${getStatusPillClasses(statusPill.tone)}`}>
            {statusPill.icon}
            {statusPill.label}
          </div>
        </div>

        {/* Channel Info Grid */}
        {account.platformData?.channelInfo && (
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800/50 bg-slate-900/30 p-3">
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500 font-medium">Channel</div>
              <div className="mt-1.5 text-sm font-medium text-slate-100">
                {account.platformData.channelInfo.title || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500 font-medium">Subscribers</div>
              <div className="mt-1.5 text-sm font-medium text-slate-100">
                {account.platformData.channelInfo.subscriberCount
                  ? new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(account.platformData.channelInfo.subscriberCount)
                  : 'Private'}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500 font-medium">Videos</div>
              <div className="mt-1.5 text-sm font-medium text-slate-100">
                {account.platformData.channelInfo.videoCount || '0'}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            <span>{account.totalUploads || 0} uploads</span>
          </div>
          {account.lastPostTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Last: {new Date(account.lastPostTime).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {account.consecutiveErrors > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{account.lastErrorMessage || `${account.consecutiveErrors} consecutive errors`}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="border-t border-slate-800 pt-4 flex justify-end">
          <button
            onClick={onDelete}
            disabled={!account.isActive}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Disconnect account"
          >
            <Trash2 className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Delete Confirmation Modal
 */
function DeleteConfirmationModal({ accountId, isDeleting, onConfirm, onCancel }) {
  return (
    <ModalPortal>
    <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-6 bg-backdrop-blur">
        
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-800 pb-4">
          <div className="flex-shrink-0 rounded-lg bg-violet-500/20 p-2">
            <AlertCircle className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Disconnect Account?</h3>
            <p className="mt-1 text-xs text-slate-400">
              This will revoke access to this YouTube account. You can reconnect it later if needed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}


