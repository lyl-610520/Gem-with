// src/api/musicApi.js (最终、完整、无遗漏版)

import axios from 'axios';

// 从环境变量获取后端 API 的基础 URL
const API_URL = process.env.REACT_APP_API_URL;

// 创建一个 Axios 实例，方便统一设置
const apiClient = axios.create({
  baseURL: API_URL,
});

// Axios 拦截器，自动为每个请求添加 JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- 引擎一：Spotify Link API ---

/**
 * 通用的 Spotify API 代理请求
 */
export const spotifyProxyRequest = (endpoint, method = 'get', params = {}) => {
  return apiClient.post('/spotify/proxy', { endpoint, method, params });
};

/**
 * 从后端获取 Spotify 的授权 URL
 */
export const getSpotifyAuthUrl = (qqId) => {
  return apiClient.get(`/spotify/auth-url?qq_id=${qqId}`);
};


// --- 引擎二：Companion Player API (本地音乐) ---

/**
 * 获取用户上传的本地音乐列表
 */
export const getLocalPlaylist = async () => {
  const response = await apiClient.get('/local_music/playlist');
  return response.data.playlist || response.data;
};

/**
 * 上传一个新的本地音乐文件
 */
export const uploadLocalMusic = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post('/local_music/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

/**
 * 删除一首本地音乐
 */
export const deleteLocalMusic = (songId) => {
  return apiClient.delete(`/local_music/delete/${songId}`);
};

/**
 * 获取本地音乐的播放流 URL
 */
export const getLocalTrackUrl = (songId) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/local_music/track/${songId}?token=${token}`;
}
