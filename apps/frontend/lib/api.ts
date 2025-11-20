import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ===== Auth =====

export async function connectWallet(walletAddress: string, signature: string) {
  const { data } = await api.post('/api/auth/connect', {
    walletAddress,
    signature,
  });
  return data;
}

// ===== Membership =====

export async function getMembershipTiers() {
  const { data } = await api.get('/api/membership/tiers');
  return data;
}

export async function purchaseMembership(tier: number, durationDays: number) {
  const { data } = await api.post('/api/membership/purchase', {
    tier,
    durationDays,
  });
  return data;
}

export async function getMembership(nftId: string) {
  const { data } = await api.get(`/api/membership/${nftId}`);
  return data;
}

// ===== Content =====

export async function getContent(params: {
  page?: number;
  limit?: number;
  genre?: string;
  search?: string;
}) {
  const { data } = await api.get('/api/content', { params });
  return data;
}

export async function getContentById(id: string) {
  const { data } = await api.get(`/api/content/${id}`);
  return data;
}

// ===== Streaming =====

export async function startStream(contentId: string) {
  const { data } = await api.post('/api/stream/start', { contentId });
  return data;
}

export async function sendHeartbeat(sessionId: string, progress: number) {
  const { data } = await api.post('/api/stream/heartbeat', {
    sessionId,
    progress,
  });
  return data;
}

export async function endStream(sessionId: string, watchDuration: number) {
  const { data } = await api.post('/api/stream/end', {
    sessionId,
    watchDuration,
  });
  return data;
}

// ===== Upload (Creator) =====

export async function registerAsUploader() {
  const { data } = await api.post('/api/upload/register');
  return data;
}

export async function uploadContent(formData: FormData) {
  const { data } = await api.post('/api/upload/content', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function getUploaderAnalytics() {
  const { data } = await api.get('/api/upload/analytics');
  return data;
}

// ===== Revenue =====

export async function getEarnings() {
  const { data } = await api.get('/api/revenue/earnings');
  return data;
}

export async function claimEarnings() {
  const { data } = await api.post('/api/revenue/claim');
  return data;
}

export default api;
