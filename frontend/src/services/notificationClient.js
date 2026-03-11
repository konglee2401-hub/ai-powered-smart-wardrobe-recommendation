import { io } from 'socket.io-client';

const resolveSocketUrl = () => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiBase.replace(/\/api\/?$/, '');
};

let socket = null;

export const connectNotificationSocket = ({ onNotify } = {}) => {
  if (socket) return socket;
  socket = io(resolveSocketUrl(), {
    transports: ['websocket', 'polling'],
  });

  if (onNotify) {
    socket.on('notify', onNotify);
  }

  return socket;
};

export const disconnectNotificationSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};
