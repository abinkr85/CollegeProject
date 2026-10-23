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

function dataUrlToBlob(dataUrl) {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Failed to convert dataURL to blob:', err);
    return null;
  }
}

export async function uploadStudentIdCard(payload) {
  let body = payload;
  let isFormData = payload instanceof FormData;

  if (!isFormData && (payload?.frontImage || payload?.backImage)) {
    const formData = new FormData();
    if (payload.studentIdNumber) formData.append('studentIdNumber', payload.studentIdNumber);
    if (payload.department) formData.append('department', payload.department);
    if (payload.year) formData.append('year', payload.year);

    if (payload.frontImage) {
      if (typeof payload.frontImage === 'string' && payload.frontImage.startsWith('data:')) {
        const blob = dataUrlToBlob(payload.frontImage);
        if (blob) {
          formData.append('frontImage', blob, 'front_card.jpg');
        } else {
          formData.append('frontImage', payload.frontImage);
        }
      } else {
        formData.append('frontImage', payload.frontImage);
      }
    }

    if (payload.backImage) {
      if (typeof payload.backImage === 'string' && payload.backImage.startsWith('data:')) {
        const blob = dataUrlToBlob(payload.backImage);
        if (blob) {
          formData.append('backImage', blob, 'back_card.jpg');
        } else {
          formData.append('backImage', payload.backImage);
        }
      } else {
        formData.append('backImage', payload.backImage);
      }
    }

    body = formData;
    isFormData = true;
  }

  // Do NOT manually set 'Content-Type': 'multipart/form-data' on FormData!
  // Doing so omits the boundary parameter, which causes multipart parsers to reject the request with 400.
  const { data } = await axiosInstance.post('/api/user/id-card', body);
  return unwrapEnvelope(data);
}

export async function scanAndCropIdCardApi(payload) {
  const { data } = await axiosInstance.post('/api/user/id-card/scan-crop', payload);
  return unwrapEnvelope(data);
}


