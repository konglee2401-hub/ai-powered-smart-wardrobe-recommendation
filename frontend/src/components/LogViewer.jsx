import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy } from 'lucide-react';
import io from 'socket.io-client';
import ModalPortal from './ModalPortal';
import axiosInstance from '../services/axios';

/**
 * Real-time Log Viewer using Socket.io
 * Displays streaming logs from backend processes
 */
export default function LogViewer({ sessionId, onClose, isOpen }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('running'); // running, completed, failed
  const [activeSession, setActiveSession] = useState(sessionId);
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [processRunning, setProcessRunning] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [processInfo, setProcessInfo] = useState(null);
  const [command, setCommand] = useState('');
  const [argsText, setArgsText] = useState('');
  const [cwd, setCwd] = useState('');
  const [notice, setNotice] = useState(null); // { text, type }

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
    // sync when parent prop changes
    if (sessionId) setActiveSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!isOpen || !activeSession) return;

    console.log(`ðŸ”Œ Connecting to log session: ${activeSession}`);

    // Connect to Socket.io
    socketRef.current = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Connection lifecycle events
    socketRef.current.on('connect', () => {
      console.log(`Socket.IO connected, joining log session: ${activeSession}`);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    // Handle log session join responses
    socketRef.current.on('log-session-joined', (data) => {
      console.log(`✅ Successfully joined log session with ${data.logsCount} existing logs`);
    });

    socketRef.current.on('log-session-error', (data) => {
      console.log(`📋 Session not ready yet - using polling fallback`);
    });

    // Join log session
    socketRef.current.emit('join-log-session', activeSession);

    // Receive logs
    socketRef.current.on('log', (message) => {
      console.log('ðŸ“¨ Received log:', message);
      
      // Handle both direct log entries and wrapped messages
      const logEntry = message.data || message;
      if (logEntry) {
        setLogs(prev => [...prev, logEntry]);
      }
    });

    // Receive historical logs (for newly connected clients)
    socketRef.current.on('log-history', (message) => {
      console.log('Received log-history event:', message);
      if (message.logs) {
        console.log(`Loading ${message.logs.length} historical logs`);
        setLogs(message.logs);
        if (message.status && message.status !== 'running') {
          setStatus(message.status);
        }
      }
    });

    // Session ended
    socketRef.current.on('log-session-end', (message) => {
      console.log(`ðŸ Log session ended: ${message.status}`);
      setStatus(message.status);
    });

    // Process attach/detach events
    socketRef.current.on('process-attached', (payload) => {
      try {
        const p = typeof payload === 'string' ? JSON.parse(payload) : payload;
        setProcessRunning(true);
        setProcessInfo({ pid: p.pid || null, scriptName: p.scriptName || null });
        setNotice({ text: `Process attached (pid=${p.pid || 'n/a'})`, type: 'info' });
        setTimeout(() => setNotice(null), 4000);
      } catch (e) {}
    });

    socketRef.current.on('process-detached', (payload) => {
      try {
        const p = typeof payload === 'string' ? JSON.parse(payload) : payload;
        setProcessRunning(false);
        setProcessInfo(null);
        setNotice({ text: `Process detached`, type: 'info' });
        setTimeout(() => setNotice(null), 3000);
      } catch (e) {}
    });

    // FallBack: Poll for logs every 2 seconds (in case WebSocket doesn't work)
    const pollInterval = setInterval(async () => {
      try {
        const response = await axiosInstance.get(`/auth-setup/logs/${activeSession}`);
        if (response.data?.success && response.data?.logs?.length > 0) {
          setLogs(response.data.logs);
        }
      } catch (error) {
        console.error('Error polling logs:', error);
      }
    }, 2000);

    // initial check handled by polling effect

    return () => {
      // Cleanup
      clearInterval(pollInterval);
      if (socketRef.current) {
        socketRef.current.emit('leave-log-session', activeSession);
        socketRef.current.disconnect();
      }
    };
  }, [activeSession, isOpen]);

  // Poll for attached process info every 2s so UI can enable/disable controls
  useEffect(() => {
    if (!isOpen || !activeSession) return;
    let mounted = true;

    const poll = async () => {
      try {
        const r = await axiosInstance.get(`/auth-setup/session-process/${activeSession}`);
        if (!mounted) return;
        if (r.data?.success && r.data?.exists) {
          setProcessRunning(true);
          setProcessInfo({ pid: r.data.pid || null, scriptName: r.data.scriptName || null });
        } else {
          setProcessRunning(false);
          setProcessInfo(null);
        }
      } catch (e) {
        // ignore transient errors
      }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [isOpen, activeSession]);

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${activeSession || sessionId}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLogsToClipboard = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText);
  };

  const getAuthHeaders = () => {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  };

  // Kill a running process attached to this session
  const killSession = async () => {
    try {
      await fetch('/api/auth-setup/run/kill-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminKey?{ 'x-admin-key': adminKey }:{}) , ...getAuthHeaders() },
        body: JSON.stringify({ sessionId: activeSession, signal: 'SIGTERM' })
      });
      setProcessRunning(false);
    } catch (e) {
      console.error('Kill session failed', e);
    }
  };

  // Send ENTER to process stdin
  const sendEnter = async () => {
    try {
      await fetch('/api/auth-setup/run/session-stdin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminKey?{ 'x-admin-key': adminKey }:{}) , ...getAuthHeaders() },
        body: JSON.stringify({ sessionId: activeSession, data: '\n' })
      });
    } catch (e) {
      console.error('Send stdin failed', e);
    }
  };

  const runAutoLogin = async (mode) => {
    try {
      const url = `/api/auth-setup/run/chatgpt-auto-login${mode?('?mode='+mode):''}`;
      const r = await fetch(url, { method: 'POST', headers: { ...getAuthHeaders() } });
      const j = await r.json();
      if (j.success && j.sessionId) {
        setActiveSession(j.sessionId);
        setLogs([]);
        setStatus('running');
        setNotice({ text: 'Auto-login started', type: 'success' });
        setTimeout(() => setNotice(null), 3000);
      } else {
        console.error('Failed to start auto-login', j);
      }
    } catch (e) {
      console.error('Run auto-login failed', e);
    }
  };

  const runCommand = async () => {
    try {
      const args = argsText ? argsText.split(' ').filter(Boolean) : [];
      const r = await fetch('/api/auth-setup/run/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminKey?{ 'x-admin-key': adminKey }:{}) , ...getAuthHeaders() },
        body: JSON.stringify({ command, args, cwd })
      });
      const j = await r.json();
      if (j.success && j.sessionId) {
        setActiveSession(j.sessionId);
        setLogs([]);
        setStatus('running');
        setNotice({ text: 'Command started', type: 'success' });
        setTimeout(() => setNotice(null), 3000);
        console.log('Command started, sessionId=', j.sessionId);
      } else {
        console.error('Failed to run command', j);
      }
    } catch (e) {
      console.error('runCommand failed', e);
    }
  };

  if (!isOpen) return null;

  const statusColor = {
    'running': 'text-blue-400',
    'completed': 'text-green-400',
    'failed': 'text-red-400'
  }[status];

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center app-layer-modal p-3 md:p-6">
      <div className="bg-gray-900 rounded-xl border border-purple-400/60 shadow-2xl w-full max-w-6xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-700 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">ðŸ“‹ Auto-Login Logs</div>
            <div className={`text-sm font-mono ${statusColor}`}>
              {status === 'running' && 'â³ Running...'}
              {status === 'completed' && 'âœ… Completed'}
              {status === 'failed' && 'âŒ Failed'}
            </div>
            {notice && (
              <div className="ml-3 px-2 py-1 rounded text-xs bg-white/8 text-white">
                {notice.text}
              </div>
            )}
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
              Waiting for logs... ðŸ•
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
              {isAutoScrollEnabled ? 'ðŸ“ Auto-Scroll' : 'ðŸ“Œ Paused'}
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
            <input
              type="password"
              placeholder="admin key (optional)"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              style={{ width: 220 }}
            />
            <button
              onClick={() => runAutoLogin()}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm flex items-center gap-1.5 text-white transition"
              title="Run Auto-Login"
            >
              â–¶ï¸ Run Auto-Login
            </button>
            <button
              onClick={() => runAutoLogin('validate')}
              className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm flex items-center gap-1.5 text-white transition"
              title="Validate Session"
            >
              âœ”ï¸ Validate
            </button>
            <button
              onClick={sendEnter}
              disabled={!processRunning}
              className={`px-4 py-2 ${processRunning? 'bg-gray-700 hover:bg-gray-600':'bg-gray-600 opacity-50'} rounded-lg text-sm flex items-center gap-1.5 text-white transition`}
              title="Send ENTER to process"
            >
              âŽ Send ENTER
            </button>
            <button
              onClick={killSession}
              disabled={!processRunning}
              className={`px-4 py-2 ${processRunning? 'bg-red-700 hover:bg-red-600':'bg-gray-600 opacity-50'} rounded-lg text-sm flex items-center gap-1.5 text-white transition`}
              title="Kill running process"
            >
              <X className="w-4 h-4" /> Kill
            </button>
            <div className="flex items-center gap-2">
              <input placeholder="command" value={command} onChange={e=>setCommand(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white" />
              <input placeholder="args (space separated)" value={argsText} onChange={e=>setArgsText(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white" />
              <input placeholder="cwd (optional)" value={cwd} onChange={e=>setCwd(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white" />
              <button onClick={runCommand} className="px-3 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-sm text-white">Run Command</button>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {logs.length} log{logs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}


