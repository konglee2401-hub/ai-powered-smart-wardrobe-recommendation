import apiClient from '../config/api';

const unwrap = (promise) => promise.then((response) => response.data);

export const notificationApi = {
  list: (params = {}) => unwrap(apiClient.get('/notifications', { params })),
  markRead: (payload = {}) => unwrap(apiClient.post('/notifications/mark-read', payload)),
};

export default notificationApi;
