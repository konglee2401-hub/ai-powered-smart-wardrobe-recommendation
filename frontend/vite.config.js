import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';

// Custom HTTP agent with keep-alive for long-running operations
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 120000, // 2 minutes timeout
  keepAliveMsecs: 30000, // Send keep-alive every 30 seconds
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        agent: httpAgent,
        timeout: 120000,        // 2 minutes for API calls
        proxyTimeout: 120000,   // 2 minutes for socket timeout
        ws: true,               // Enable WebSocket support
      },
    },
    middlewareMode: false,
    hmr: {
      protocol: 'http',
      host: 'localhost',
      port: 3000,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react'],
        },
      },
    },
  },
});
