import axiosInstance from './axiosInstance';

function unwrapEnvelope(responseBody) {
  return responseBody?.data ?? responseBody;
}

export async function getUserSettings() {
  const { data } = await axiosInstance.get('/api/user/profile');
  return unwrapEnvelope(data);
}

export async function updateUserProfile(payload) {
  const { data } = await axiosInstance.put('/api/user/profile', payload);
  return unwrapEnvelope(data);
}

export async function updateUserNotifications(payload) {
  const { data } = await axiosInstance.put('/api/user/notifications', payload);
  return unwrapEnvelope(data);
}

export async function revokeAllSessions() {
  const { data } = await axiosInstance.post('/api/user/revoke-sessions');
  return unwrapEnvelope(data);
}
