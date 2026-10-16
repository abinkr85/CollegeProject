import axiosInstance from './axiosInstance';
import { roleToApiSegment } from '../portalConfig';

function unwrapEnvelope(responseBody) {
  return responseBody?.data ?? responseBody;
}

function normalizeUser(user) {
  if (!user) return user;
  return {
    ...user,
    role: user.role?.toLowerCase()
  };
}

function normalizeAuthPayload(payload) {
  if (!payload) return payload;
  return {
    ...payload,
    user: normalizeUser(payload.user)
  };
}

export async function registerUser(payload, role) {
  const segment = roleToApiSegment(role);
  const { data } = await axiosInstance.post(`/api/auth/${segment}/register`, payload, {
    skipAuthRefresh: true
  });
  return normalizeAuthPayload(unwrapEnvelope(data));
}

export async function loginUser(payload, role) {
  const segment = roleToApiSegment(role);
  const { data } = await axiosInstance.post(`/api/auth/${segment}/login`, payload, {
    skipAuthRefresh: true
  });
  return normalizeAuthPayload(unwrapEnvelope(data));
}

export async function verifyMfaLogin(payload, role) {
  const segment = roleToApiSegment(role);
  const { data } = await axiosInstance.post(`/api/auth/${segment}/login/verify-mfa`, payload, {
    skipAuthRefresh: true
  });
  return normalizeAuthPayload(unwrapEnvelope(data));
}

export async function logoutUser() {
  const { data } = await axiosInstance.post('/api/auth/logout', null, {
    skipAuthRefresh: true
  });
  return unwrapEnvelope(data);
}

export async function changePassword(payload) {
  const { data } = await axiosInstance.patch('/api/auth/password', payload);
  return unwrapEnvelope(data);
}

export async function refreshUserSession() {
  const { data } = await axiosInstance.post('/api/auth/refresh', null, {
    skipAuthRefresh: true
  });
  return normalizeAuthPayload(unwrapEnvelope(data));
}
