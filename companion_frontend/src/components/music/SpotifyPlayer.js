// src/components/music/SpotifyPlayer.js (UI渲染逻辑修正版)

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText, IconButton,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { styled } from '@mui/system';
import { FaSpotify, FaSearch, FaPlus } from 'react-icons/fa';

import { getSpotifyAuthUrl, spotifyProxyRequest } from '../../api/musicApi';

// 样式组件 (保持不变)
const PlayerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  textAlign: 'center',
  minHeight: '300px', // 增加最小高度以容纳新内容
  display: 'flex',
  flexDirection: 'column',
}));

const SpotifyButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1DB954',
  color: 'white',
  fontWeight: 'bold',
  padding: theme.spacing(1.5, 4),
  borderRadius: '50px',
  '&:hover': { backgroundColor: '#1ED760' },
}));


function SpotifyPlayer({ user, isSpotifyLinked }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 状态管理
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isSpotifyLinked) {
      setIsLoading(true);
      setError(''); // 重置错误
      spotifyProxyRequest('me/playlists')
        .then(response => {
          if (response.data && response.data.items) {
            setPlaylists(response.data.items);
            if (response.data.items.length > 0) {
              setSelectedPlaylistId(response.data.items[0].id);
            }
          }
        })
        .catch(err => setError("无法加载您的播放列表"))
        .finally(() => setIsLoading(false));
    }
  }, [isSpotifyLinked]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await getSpotifyAuthUrl(user.qq_id);
      const { auth_url } = response.data;
      window.location.href = auth_url;
    } catch (err) {
      setError('无法获取授权链接，请稍后再试。');
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setError('');
    try {
      const params = { q: searchTerm, type: 'track', limit: 10 };
      const response = await spotifyProxyRequest('search', 'get', params);
      if (response.data && response.data.tracks && response.data.tracks.items.length > 0) {
        setSearchResults(response.data.tracks.items);
      } else {
        setError("没有找到匹配的歌曲");
      }
    } catch (err) {
      setError("搜索失败，请稍后再试");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToPlaylist = async (trackUri) => {
    if (!selectedPlaylistId) {
      setError("请先选择一个播放列表");
      return;
    }
    setError('');
    try {
      const endpoint = `playlists/${selectedPlaylistId}/tracks`;
      const params = { uris: [trackUri] };
      await spotifyProxyRequest(endpoint, 'post', params);
      alert('添加成功！'); // 暂时用 alert 提示
    } catch (err) {
      setError("添加到播放列表失败");
    }
  };

  // VVVV [这里是修正后的完整UI渲染逻辑] VVVV
  
  // --- UI 渲染 ---
  if (!isSpotifyLinked) {
    // --- 未连接状态的UI ---
    return (
      <PlayerContainer sx={{ justifyContent: 'center' }}>
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
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      
      <Typography variant="h5" gutterBottom>Spotify 控制台</Typography>
      
      {isLoading ? (
         <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <>
          {/* 搜索区域 */}
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, my: 2 }}>
            <TextField 
              fullWidth
              size="small"
              variant="outlined"
              label="搜索歌曲或艺术家"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <IconButton type="submit" color="primary" disabled={isSearching}>
              {isSearching ? <CircularProgress size={24} /> : <FaSearch />}
            </IconButton>
          </Box>

          {/* 结果和添加区域 */}
          {searchResults.length > 0 && (
            <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <FormControl fullWidth size="small">
                <InputLabel>添加到播放列表</InputLabel>
                <Select
                  value={selectedPlaylistId}
                  label="添加到播放列表"
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                >
                  {playlists.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
              <List sx={{ overflowY: 'auto', mt: 1 }}>
                {searchResults.map(track => (
                  <ListItem 
                    key={track.id}
                    secondaryAction={
                      <IconButton edge="end" title="添加到歌单" onClick={() => handleAddToPlaylist(track.uri)}>
                        <FaPlus />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={track.name} 
                      secondary={track.artists.map(a => a.name).join(', ')} 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* 初始提示 */}
          {searchResults.length === 0 && !isSearching && (
             <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Typography color="text.secondary">输入关键词，开始搜索你喜欢的音乐吧！</Typography>
             </Box>
          )}
        </>
      )}
    </PlayerContainer>
  );
  // ^^^^ [修正结束] ^^^^
}

export default SpotifyPlayer;
