import axiosInstance from './axiosInstance';

const statusToApi = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED'
};

const priorityToApi = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW'
};

const statusFromApi = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved'
};

const priorityFromApi = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

function unwrapEnvelope(responseBody) {
  return responseBody?.data ?? responseBody;
}

function normalizeParams(params) {
  return Object.fromEntries(
    Object.entries({
      ...params,
      status: statusToApi[params.status] ?? params.status,
      priority: priorityToApi[params.priority] ?? params.priority
    }).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

function normalizeComplaint(complaint) {
  if (!complaint) return complaint;
  return {
    ...complaint,
    status: statusFromApi[complaint.status] ?? complaint.status,
    priority: priorityFromApi[complaint.priority] ?? complaint.priority
  };
}

function normalizeUpdatePayload(payload) {
  return {
    status: statusToApi[payload.status] ?? payload.status,
    department: payload.department,
    adminNote: payload.admin_note ?? payload.adminNote ?? null
  };
}

export async function getAllComplaints(params = {}) {
  const { data } = await axiosInstance.get('/api/admin/complaints', {
    params: normalizeParams(params)
  });
  const complaints = unwrapEnvelope(data) || [];
  return {
    complaints: complaints.map(normalizeComplaint),
    pagination: data.meta
  };
}

export async function updateComplaint(id, payload) {
  const { data } = await axiosInstance.put(`/api/admin/complaints/${id}`, normalizeUpdatePayload(payload));
  return normalizeComplaint(unwrapEnvelope(data));
}

export async function addInternalNote(id, note) {
  const { data } = await axiosInstance.post(`/api/admin/complaints/${id}/internal-notes`, {
    note
  });
  return unwrapEnvelope(data);
}

export async function exportCSV(params = {}) {
  const response = await axiosInstance.get('/api/admin/complaints/export', {
    params: normalizeParams(params),
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getSummaryAnalytics() {
  const { data } = await axiosInstance.get('/api/analytics/summary');
  const summary = unwrapEnvelope(data);
  return {
    ...summary,
    averageResolutionHours: Number(((summary.avgResolutionDays || 0) * 24).toFixed(2))
  };
}

export async function getByCategoryAnalytics() {
  const { data } = await axiosInstance.get('/api/analytics/by-category');
  return unwrapEnvelope(data);
}

export async function getMonthlyTrendAnalytics() {
  const { data } = await axiosInstance.get('/api/analytics/monthly-trend');
  return unwrapEnvelope(data);
}

export async function getDepartmentPerformanceAnalytics() {
  const { data } = await axiosInstance.get('/api/analytics/department-perf');
  return (unwrapEnvelope(data) || []).map((item) => ({
    ...item,
    pending: Math.max((item.total || 0) - (item.resolved || 0), 0),
    averageResolutionHours: Number(((item.avgDays || 0) * 24).toFixed(2))
  }));
}

export async function getAdminSettings(config = {}) {
  const { data } = await axiosInstance.get('/api/admin/settings', config);
  return unwrapEnvelope(data);
}

export async function updateAdminProfile(payload) {
  const { data } = await axiosInstance.put('/api/admin/settings/profile', payload);
  return unwrapEnvelope(data);
}

export async function updateAdminNotifications(payload) {
  const { data } = await axiosInstance.put('/api/admin/settings/notifications', payload);
  return unwrapEnvelope(data);
}

export async function updateAdminSystem(payload) {
  const { data } = await axiosInstance.put('/api/admin/settings/system', payload);
  return unwrapEnvelope(data);
}

export async function getAdminNotifications(limit = 10) {
  const { data } = await axiosInstance.get('/api/admin/notifications', {
    params: {
      limit
    }
  });
  return unwrapEnvelope(data);
}

export async function markAdminNotificationRead(id) {
  const { data } = await axiosInstance.patch(`/api/admin/notifications/${id}/read`);
  return unwrapEnvelope(data);
}

export async function markAllAdminNotificationsRead() {
  const { data } = await axiosInstance.patch('/api/admin/notifications/read-all');
  return unwrapEnvelope(data);
}

export async function getAdminUsers(params = {}) {
  const { data } = await axiosInstance.get('/api/admin/users', {
    params: Object.fromEntries(
      Object.entries(params).filter(([, val]) => val !== '' && val !== null && val !== undefined)
    ),
  });
  return data;
}

export async function unlockUserAccount(userId) {
  const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/unlock`);
  return unwrapEnvelope(data);
}
