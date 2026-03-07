import axiosInstance from './axios';

export async function getGenerationSessions(params = {}) {
  const response = await axiosInstance.get('/debug-sessions', {
    params: {
      page: params.page || 1,
      limit: params.limit || 24,
      search: params.search || '',
      flowType: params.flowType || 'all',
      status: params.status || 'all',
    },
  });

  return response.data;
}

export async function getGenerationSessionDetail(sessionId) {
  const response = await axiosInstance.get(`/debug-sessions/${sessionId}`);
  return response.data;
}

export async function deleteGenerationSession(sessionId) {
  const response = await axiosInstance.delete(`/debug-sessions/${sessionId}`);
  return response.data;
}

export async function captureGenerationSession(sessionId, payload = {}) {
  const response = await axiosInstance.post(`/debug-sessions/${sessionId}/capture`, payload);
  return response.data;
}
