import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Copy, Loader2, AlertCircle } from 'lucide-react';

const SessionLogModal = ({ isOpen, onClose, sessionId, flowId }) => {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (isOpen && flowId) {
      loadSessionLog();
    }
  }, [isOpen, flowId]);

  const loadSessionLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/debug-sessions/${flowId}`);
      if (!response.ok) {
        throw new Error(`Failed to load session log: ${response.status}`);
      }
      const data = await response.json();
      setSessionData(data.data || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const groupLogsByCategory = (logs) => {
    const grouped = {};
    logs?.forEach(log => {
      const category = log.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(log);
    });
    return grouped;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    return new Date(ts).toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Session Log Viewer</h2>
            <p className="text-xs text-gray-400 mt-1">Flow ID: {flowId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSessionLog}
              disabled={loading}
              className="px-3 py-1 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded transition-colors flex items-center gap-1"
              title="Refresh logs"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="ml-2 text-gray-400">Loading session data...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/30 border border-red-700 m-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold">Error Loading Session</p>
                <p className="text-red-200 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : sessionData ? (
            <div className="p-4 space-y-4">
              {/* Session Metadata */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-blue-300 mb-3">📋 Session Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                      sessionData.status === 'completed' ? 'bg-green-600/30 text-green-300' :
                      sessionData.status === 'failed' ? 'bg-red-600/30 text-red-300' :
                      'bg-yellow-600/30 text-yellow-300'
                    }`}>
                      {sessionData.status || 'unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Flow Type:</span>
                    <span className="text-gray-300 ml-2">{sessionData.flowType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Started:</span>
                    <span className="text-gray-300 ml-2">{new Date(sessionData.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-300 ml-2">
                      {sessionData.metrics?.totalDuration || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage Metrics */}
              {sessionData.metrics?.stages && sessionData.metrics.stages.length > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3">⏱️ Stage Timings</h3>
                  <div className="space-y-2">
                    {sessionData.metrics.stages.map((stage, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-400">{stage.name}</span>
                          {stage.success && <span className="text-green-400 ml-2">✓</span>}
                          {!stage.success && <span className="text-red-400 ml-2">✗</span>}
                        </div>
                        <span className="text-gray-500">{stage.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artifacts */}
              {sessionData.artifacts && Object.keys(sessionData.artifacts).length > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-green-300 mb-3">📦 Generated Artifacts</h3>
                  <div className="space-y-2 text-sm">
                    {sessionData.artifacts.images && (
                      <div>
                        <span className="text-gray-400">Images:</span>
                        {typeof sessionData.artifacts.images === 'object' ? (
                          <div className="text-gray-500 text-xs ml-4 mt-1 space-y-1">
                            {Object.entries(sessionData.artifacts.images).map(([key, val]) => (
                              <div key={key}>{key}: {typeof val === 'string' ? val : JSON.stringify(val)}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 ml-2">{sessionData.artifacts.images}</span>
                        )}
                      </div>
                    )}
                    {sessionData.artifacts.videos && (
                      <div>
                        <span className="text-gray-400">Videos:</span>
                        <span className="text-gray-500 ml-2">{JSON.stringify(sessionData.artifacts.videos).substring(0, 100)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Analysis Data */}
              {sessionData.analysis && Object.keys(sessionData.analysis).length > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-3">🔍 Analysis Data</h3>
                  <div className="text-xs text-gray-400 space-y-1">
                    {Object.entries(sessionData.analysis).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500">{key}:</span>
                        <span className="text-gray-400 max-w-xs truncate">
                          {typeof val === 'object' ? JSON.stringify(val).substring(0, 50) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logs by Category */}
              {sessionData.logs && sessionData.logs.length > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-amber-300 mb-3">📝 Logs ({sessionData.logs.length})</h3>
                  <div className="space-y-2">
                    {Object.entries(groupLogsByCategory(sessionData.logs)).map(([category, logs]) => (
                      <div key={category} className="border border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedLogs(prev => ({
                            ...prev,
                            [category]: !prev[category]
                          }))}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedLogs[category] ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm font-semibold text-gray-300">{category}</span>
                            <span className="text-xs text-gray-500">({logs.length})</span>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(
                                logs.map(l => `[${formatTimestamp(l.timestamp)}] ${l.message}`).join('\n'),
                                `${category}-copy`
                              );
                            }}
                            className="text-gray-500 hover:text-white transition-colors p-1 cursor-pointer"
                            title="Copy logs"
                          >
                            <Copy className="w-3 h-3" />
                          </div>
                        </button>
                        {expandedLogs[category] && (
                          <div className="bg-black/30 p-3 max-h-48 overflow-y-auto border-t border-gray-700 space-y-1">
                            {logs.map((log, idx) => (
                              <div
                                key={idx}
                                className="text-xs font-mono text-gray-400 hover:text-gray-300 transition-colors"
                              >
                                <span className="text-gray-600">[{formatTimestamp(log.timestamp)}]</span>
                                <span className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : ''}>
                                  {' '}{log.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Info */}
              {sessionData.error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-300 mb-2">❌ Error Details</h3>
                  <div className="text-sm text-red-400">
                    <p><span className="text-red-500">Stage:</span> {sessionData.error.stage}</p>
                    <p className="mt-1"><span className="text-red-500">Message:</span> {sessionData.error.message}</p>
                    {sessionData.error.stack && (
                      <pre className="mt-2 text-xs bg-black/50 p-2 rounded overflow-x-auto">
                        {sessionData.error.stack}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={() => loadSessionLog()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              const fullLog = JSON.stringify(sessionData, null, 2);
              copyToClipboard(fullLog, 'full-log');
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copiedId === 'full-log' ? 'Copied!' : 'Copy All'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionLogModal;
