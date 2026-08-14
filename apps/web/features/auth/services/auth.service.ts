import { apiClient } from '../../../lib/api/api-client';

export const authService = {
  login: apiClient.login.bind(apiClient),
  refreshSession: apiClient.refreshSession.bind(apiClient),
  getCurrentUser: apiClient.getCurrentUser.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  clearSession: apiClient.clearSession.bind(apiClient),
};
