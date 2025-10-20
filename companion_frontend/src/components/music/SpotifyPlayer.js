// src/components/music/SpotifyPlayer.js (功能唤醒版)

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/system';
import { FaSpotify } from 'react-icons/fa';

// 引入我们即将创建的新的 API 函数
import { getSpotifyAuthUrl, spotifyProxyRequest } from '../../api/musicApi';

const PlayerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  textAlign: 'center',
  minHeight: '200px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
}));

const SpotifyButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1DB954', // Spotify 标志性的绿色
  color: 'white',
  fontWeight: 'bold',
  padding: theme.spacing(1.5, 4),
  borderRadius: '50px',
  transition: 'transform 0.2s ease, background-color 0.2s ease',
  '&:hover': {
    backgroundColor: '#1ED760',
    transform: 'scale(1.05)',
  },
}));

// [核心修改] 组件现在接收一个叫 isSpotifyLinked 的新 prop
function SpotifyPlayer({ user, isSpotifyLinked }) {
  const [isLoading, setIsLoading] = useState(false); // 只用于点击按钮后的加载状态
  const [error, setError] = useState('');
  const [playlists, setPlaylists] = useState([]);

  // [核心修改] 我们现在用 useEffect 来根据 isSpotifyLinked 的变化加载数据
  useEffect(() => {
    // 只有在明确知道已连接时，才去获取播放列表
    if (isSpotifyLinked) {
      const fetchPlaylists = async () => {
        try {
          const response = await spotifyProxyRequest('me/playlists');
          setPlaylists(response.data.items);
        } catch (err) {
          console.error("获取Spotify播放列表失败:", err);
          setError("无法加载您的播放列表，请尝试重新连接。");
        }
      };
      fetchPlaylists();
    }
  }, [isSpotifyLinked]); // 依赖项是 isSpotifyLinked，当它变化时会触发

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // 这里的 user.qq_id 现在由 App.js 稳定提供
      const response = await getSpotifyAuthUrl(user.qq_id);
      const { auth_url } = response.data;
      window.location.href = auth_url;
    } catch (err) {
      setError('无法获取授权链接，请稍后再试。');
      setIsLoading(false);
      console.error(err);
    }
  };

  if (!isSpotifyLinked) {
    // --- 未连接状态的UI ---
    return (
      <PlayerContainer>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FaSpotify size={50} color="#1DB954" style={{ marginBottom: 16 }} />
        <Typography variant="h5" gutterBottom>连接您的 Spotify 账号</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          同步您的歌单与收藏，开启音乐之旅。
        </Typography>
        <SpotifyButton onClick={handleConnect} startIcon={<FaSpotify />} disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} color="inherit" /> : '立即连接'}
        </SpotifyButton>
      </PlayerContainer>
    );
  }

  // --- 已连接状态的UI ---
  return (
    <PlayerContainer>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="h5">已连接 Spotify</Typography>
      <Typography color="text.secondary">您的播放列表:</Typography>
      <Box sx={{ mt: 2, textAlign: 'left', width: '100%', maxHeight: 200, overflowY: 'auto' }}>
        {playlists.length > 0 ? (
          playlists.map(p => <Typography key={p.id}>- {p.name}</Typography>)
        ) : (
          <CircularProgress /> // 正在加载播放列表
        )}
      </Box>
    </PlayerContainer>
  );
}

export default SpotifyPlayer;
