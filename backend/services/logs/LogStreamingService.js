/**
 * LogStreamingService
 * Manages real-time log collection and streaming via WebSocket
 * Used for monitoring auto-login, image processing, and other background tasks
 */

class LogStreamingService {
  constructor() {
    // Store active sessions with their log buffers
    this.sessions = new Map(); // sessionId -> { logs: [], clients: Set }
    this.wsClients = new Set(); // All connected WebSocket clients
    this.processes = new Map(); // sessionId -> { child, scriptName }
  }

  /**
   * Initialize a new logging session
   */
  createSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        logs: [],
        clients: new Set(),
        startTime: Date.now(),
        status: 'running' // running, completed, failed
      });
    }
    return sessionId;
  }

  /**
   * Add a log entry to a session
   */
  addLog(sessionId, message, level = 'info') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level, // 'info', 'warn', 'error', 'success'
      message,
      elapsed: Date.now() - session.startTime
    };

    session.logs.push(logEntry);

    // Broadcast to connected clients
    this.broadcastLog(sessionId, logEntry);

    // Also log to console for debugging
    const prefix = {
      'info': '📋',
      'warn': '⚠️ ',
      'error': '❌',
      'success': '✅'
    }[level] || '📝';
    
    console.log(`[${sessionId}] ${prefix} ${message}`);
  }

  /**
   * Broadcast a single log entry to all connected clients watching this session
   */
  broadcastLog(sessionId, logEntry) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = JSON.stringify({
      type: 'log',
      sessionId,
      data: logEntry
    });

    // Send to all connected clients watching this session
    session.clients.forEach(ws => {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        } else {
          session.clients.delete(ws);
        }
      } catch (e) {
        session.clients.delete(ws);
      }
    });
  }

  /**
   * End a logging session
   */
  endSession(sessionId, status = 'completed') {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = status;
    const endMessage = JSON.stringify({
      type: 'session-end',
      sessionId,
      status,
      elapsed: Date.now() - session.startTime,
      totalLogs: session.logs.length
    });

    session.clients.forEach(ws => {
      try {
        if (ws.readyState === 1) {
          ws.send(endMessage);
        }
      } catch (e) {
        session.clients.delete(ws);
      }
    });

    // Keep session data for 5 minutes
    setTimeout(() => {
      this.sessions.delete(sessionId);
      // also clean up any attached process record if exists
      if (this.processes.has(sessionId)) this.processes.delete(sessionId);
    }, 5 * 60 * 1000);
  }

  /**
   * Attach a spawned child process to a session
   */
  attachProcess(sessionId, child, scriptName = 'script') {
    if (!sessionId || !child) return false;
    this.processes.set(sessionId, { child, scriptName });
    // Emit socket event to notify clients that a process is attached
    try {
      if (global && global.io) {
        global.io.to(`logs-${sessionId}`).emit('process-attached', JSON.stringify({ sessionId, pid: child.pid || null, scriptName }));
      }
    } catch (e) {
      // ignore
    }
    return true;
  }

  /**
   * Detach process from session
   */
  detachProcess(sessionId) {
    if (this.processes.has(sessionId)) {
      this.processes.delete(sessionId);
      try {
        if (global && global.io) {
          global.io.to(`logs-${sessionId}`).emit('process-detached', JSON.stringify({ sessionId }));
        }
      } catch (e) {}
      return true;
    }
    return false;
  }

  /**
   * Send signal to attached process
   */
  sendSignal(sessionId, signal = 'SIGTERM') {
    const p = this.processes.get(sessionId);
    if (!p || !p.child) return false;
    try {
      p.child.kill(signal);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Write to stdin of attached process
   */
  writeStdin(sessionId, data) {
    const p = this.processes.get(sessionId);
    if (!p || !p.child || !p.child.stdin) return false;
    try {
      p.child.stdin.write(data);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get process info for a session
   */
  getProcessInfo(sessionId) {
    const p = this.processes.get(sessionId);
    if (!p) return null;
    return { pid: p.child?.pid || null, scriptName: p.scriptName || null };
  }

  /**
   * Get all logs for a session
   */
  getLogs(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.logs : [];
  }

  /**
   * Register a WebSocket client to receive logs for a session
   */
  registerClient(sessionId, ws) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.clients.add(ws);
    this.wsClients.add(ws);

    // Send historical logs to new client
    const historyMessage = JSON.stringify({
      type: 'history',
      sessionId,
      logs: session.logs,
      status: session.status
    });

    try {
      ws.send(historyMessage);
    } catch (e) {
      session.clients.delete(ws);
      this.wsClients.delete(ws);
    }

    return session.logs.length;
  }

  /**
   * Unregister a WebSocket client
   */
  unregisterClient(sessionId, ws) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clients.delete(ws);
    }
    this.wsClients.delete(ws);
  }

  /**
   * Clear old sessions (called periodically)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.startTime > maxAge && session.clients.size === 0) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export default new LogStreamingService();
