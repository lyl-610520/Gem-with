// src/api/musicApi.js

import axios from 'axios';

// 从环境变量获取后端 API 的基础 URL
const API_URL = process.env.REACT_APP_API_URL;

// 创建一个 Axios 实例，方便统一设置
const apiClient = axios.create({
  baseURL: API_URL,
});

// [重要] Axios 拦截器，自动为每个请求添加 JWT Token
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
 * @param {string} endpoint - The Spotify API endpoint (e.g., 'me/playlists')
 * @param {string} method - The HTTP method ('get', 'post', 'put')
 * @param {object} params - The request parameters or body
 * @returns {Promise<any>}
 */
export const spotifyProxyRequest = (endpoint, method = 'get', params = {}) => {
  return apiClient.post('/spotify/proxy', { endpoint, method, params });
};


// --- 引擎二：Companion Player API (本地音乐) ---

/**
 * 获取用户上传的本地音乐列表
 * @returns {Promise<Array>}
 */
export const getLocalPlaylist = async () => {
  const response = await apiClient.get('/local_music/playlist');
  return response.data.playlist;
};

/**
 * 上传一个新的本地音乐文件
 * @param {File} file - The audio file to upload
 * @param {Function} onUploadProgress - Callback for upload progress
 * @returns {Promise<object>}
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
 * @param {number} songId - The ID of the song to delete
 * @returns {Promise<object>}
 */
export const deleteLocalMusic = (songId) => {
  return apiClient.delete(`/local_music/delete/${songId}`);
};

// 注意：获取音频流的 URL 我们直接拼接，而不是通过 axios
export const getLocalTrackUrl = (songId) => {
    const token = localStorage.getItem('token');
    // 这是一个小技巧，虽然我们不直接用 JWT 验证流，但可以把它作为参数防止缓存
    // 实际验证还是依赖 cookie session
    return `${API_URL}/local_music/track/${songId}?token=${token}`;
}
