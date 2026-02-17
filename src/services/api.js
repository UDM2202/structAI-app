import axios from 'axios';

// Base API configuration
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  loginWithGoogle: (token) => API.post('/auth/login/google', { idToken: token }),
  loginWithLinkedIn: (code) => API.post('/auth/login/linkedin', { code }),
  refreshToken: (refreshToken) => API.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => API.post('/auth/logout', { refreshToken }),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => API.post('/auth/reset-password', { token, newPassword }),
  changePassword: (oldPassword, newPassword) => API.post('/auth/change-password', { oldPassword, newPassword }),
};

// User profile API endpoints
export const profileAPI = {
  getProfile: () => API.get('/profile'),
  updateProfile: (profileData) => API.put('/profile', profileData),
  uploadAvatar: (formData) => API.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getPreferences: () => API.get('/profile/preferences'),
  updatePreferences: (preferences) => API.put('/profile/preferences', preferences),
};

export default API;