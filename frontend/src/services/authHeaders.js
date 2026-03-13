/**
 * Small helper to build Authorization headers from localStorage tokens.
 */

export const getAuthHeaders = () => {
  const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};
