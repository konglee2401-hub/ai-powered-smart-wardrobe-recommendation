/**
 * Account Card Component
 * Displays individual account status and actions
 */

import React, { useState } from 'react';
import { Trash2, Edit2, CheckCircle, AlertCircle, RotateCw, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export function AccountCard({ account, onDelete, onEdit, onVerify, isLoading }) {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await onVerify(account.id);
      toast.success(`${account.platform} account verified!`);
    } catch (error) {
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const getStatusColor = () => {
    switch (account.status) {
      case 'active':
        return 'border-green-500/50 bg-green-900/10';
      case 'pending':
        return 'border-yellow-500/50 bg-yellow-900/10';
      case 'inactive':
        return 'border-red-500/50 bg-red-900/10';
      default:
        return 'border-gray-700';
    }
  };

  const getStatusIcon = () => {
    if (account.status === 'active') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (account.status === 'pending') return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className={`rounded-lg border p-4 transition ${getStatusColor()}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-semibold capitalize">{account.platform}</h4>
          <p className="text-sm text-gray-400">{account.displayName || account.username}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-xs px-2 py-1 rounded capitalize ${
            account.status === 'active'
              ? 'bg-green-900/50 text-green-400'
              : account.status === 'pending'
              ? 'bg-yellow-900/50 text-yellow-400'
              : 'bg-red-900/50 text-red-400'
          }`}>
            {account.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-gray-400">Account</span>
          <span className="font-mono text-xs truncate">{account.metadata?.accountHandle || account.username || 'N/A'}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-400">Page / Channel</span>
          <span className="font-mono text-xs truncate">{account.metadata?.pageId || account.metadata?.channelId || account.metadata?.businessId || 'N/A'}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-400">API Key</span>
          <span className="font-mono text-xs">{account.metadata?.apiKey ? 'Configured' : 'Missing'}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-400">Token</span>
          <span className="font-mono text-xs">{account.metadata?.accessToken ? 'Configured' : 'Missing'}</span>
        </div>
        {account.metadata?.lastVerifiedAt && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-400">Last Verified</span>
            <span className="text-xs">{new Date(account.metadata.lastVerifiedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleVerify}
          disabled={verifying || isLoading}
          className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded transition flex items-center justify-center gap-2"
        >
          {verifying ? (
            <>
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Testing...</span>
            </>
          ) : (
            <>
              <RotateCw className="w-4 h-4" />
              <span>Test Connection</span>
            </>
          )}
        </button>
        <button
          onClick={() => onEdit(account)}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded transition"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this account?')) {
              onDelete(account.id);
            }
          }}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-red-900/30 hover:bg-red-900/50 disabled:bg-gray-800 text-red-400 rounded transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {account.metadata?.lastVerificationResult && (
        <div className="mt-3 pt-3 border-t border-gray-700/30 text-xs flex items-start gap-2 text-gray-300">
          <LinkIcon className="w-3 h-3 mt-0.5 text-blue-400 shrink-0" />
          <p className="line-clamp-2">{account.metadata.lastVerificationResult}</p>
        </div>
      )}

      {account.errors && account.errors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          <p className="text-xs text-red-400 mb-2">Recent Errors:</p>
          <ul className="text-xs space-y-1 text-red-300/70">
            {account.errors.slice(0, 2).map((error, idx) => (
              <li key={idx} className="truncate">• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
