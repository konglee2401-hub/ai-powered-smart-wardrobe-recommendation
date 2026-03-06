import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy } from 'lucide-react';
import io from 'socket.io-client';

/**
 * Real-time Log Viewer using Socket.io
 * Displays streaming logs from backend processes
 */
export default function LogViewer({ sessionId, onClose, isOpen }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('running'); // running, completed, failed
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    if (isAutoScrollEnabled && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, isAutoScrollEnabled]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    console.log(`🔌 Connecting to log session: ${sessionId}`);

    // Connect to Socket.io
    socketRef.current = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Join log session
    socketRef.current.emit('join-log-session', sessionId);

    // Receive logs
    socketRef.current.on('log', (message) => {
      console.log('📨 Received log:', message);
      
      // Handle both direct log entries and wrapped messages
      const logEntry = message.data || message;
      if (logEntry) {
        setLogs(prev => [...prev, logEntry]);
      }
    });

    // Receive historical logs (for newly connected clients)
    socketRef.current.on('log-history', (message) => {
      if (message.logs) {
        console.log(`📚 Received ${message.logs.length} historical logs`);
        setLogs(message.logs);
        if (message.status && message.status !== 'running') {
          setStatus(message.status);
        }
      }
    });

    // Session ended
    socketRef.current.on('log-session-end', (message) => {
      console.log(`🏁 Log session ended: ${message.status}`);
      setStatus(message.status);
    });

    // FallBack: Poll for logs every 2 seconds (in case WebSocket doesn't work)
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth-setup/logs/${sessionId}`);
        const data = await response.json();
        if (data.success && data.logs.length > 0) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Error polling logs:', error);
      }
    }, 2000);

    return () => {
      // Cleanup
      clearInterval(pollInterval);
      if (socketRef.current) {
        socketRef.current.emit('leave-log-session', sessionId);
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, isOpen]);

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${sessionId}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLogsToClipboard = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText);
  };

  if (!isOpen) return null;

  const statusColor = {
    'running': 'text-blue-400',
    'completed': 'text-green-400',
    'failed': 'text-red-400'
  }[status];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-6">
      <div className="bg-gray-900 rounded-xl border border-purple-400/60 shadow-2xl w-full max-w-6xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-700 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">📋 Auto-Login Logs</div>
            <div className={`text-sm font-mono ${statusColor}`}>
              {status === 'running' && '⏳ Running...'}
              {status === 'completed' && '✅ Completed'}
              {status === 'failed' && '❌ Failed'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto bg-gray-950 p-4 md:p-5 font-mono text-sm md:text-[1rem]">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Waiting for logs... 🕐
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className={`py-1 ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  log.level === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }`}
              >
                <span className="text-gray-600">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                {' '}
                <span className={`text-xs font-bold ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  log.level === 'success' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  [{log.level.toUpperCase()}]
                </span>
                {' '}
                {log.message}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:p-4 border-t border-gray-700 bg-slate-900">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
              className={`px-4 py-2 rounded-lg text-sm text-white transition ${
                isAutoScrollEnabled ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isAutoScrollEnabled ? '📍 Auto-Scroll' : '📌 Paused'}
            </button>
            <button
              onClick={copyLogsToClipboard}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-1.5 text-white transition"
              title="Copy logs to clipboard"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
            <button
              onClick={downloadLogs}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-1.5 text-white transition"
              title="Download logs as file"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
          <div className="text-xs text-gray-400">
            {logs.length} log{logs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
