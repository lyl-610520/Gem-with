// src/components/music/SpotifyPlayer.js (功能超全最终版)

import React, a{ useState, useEffect } from 'react';
import { 
  Box, Typography, Button, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText, IconButton,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { styled } from '@mui/system';
import { FaSpotify, FaSearch, FaPlus } from 'react-icons/fa';

import { getSpotifyAuthUrl, spotifyProxyRequest } from '../../api/musicApi';

const PlayerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  textAlign: 'center',
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
      spotifyProxyRequest('me/playlists')
        .then(response => {
          // 安全地访问数据
          if (response.data && response.data.items) {
            setPlaylists(response.data.items);
            // 默认选中第一个播放列表
            if (response.data.items.length > 0) {
              setSelectedPlaylistId(response.data.items[0].id);
            }
          }
        })
        .catch(err => setError("无法加载您的播放列表"))
        .finally(() => setIsLoading(false));
    }
  }, [isSpotifyLinked]);

  const handleConnect = async () => { /* ... 保持不变 ... */ };

  // --- 新增功能 ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const params = { q: searchTerm, type: 'track', limit: 10 };
      const response = await spotifyProxyRequest('search', 'get', params);
      if (response.data && response.data.tracks) {
        setSearchResults(response.data.tracks.items);
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
    try {
      const endpoint = `playlists/${selectedPlaylistId}/tracks`;
      const params = { uris: [trackUri] };
      // 使用 POST 方法
      await spotifyProxyRequest(endpoint, 'post', params);
      // (这里可以加一个成功提示，比如 Snackbar)
      alert('添加成功！'); 
    } catch (err) {
      setError("添加到播放列表失败");
    }
  };

  // --- UI 渲染 ---
  if (!isSpotifyLinked) {
    return ( /* ... 未连接状态的 UI 保持不变 ... */ );
  }

  return (
    <PlayerContainer>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      
      <Typography variant="h5" gutterBottom>Spotify 控制台</Typography>
      
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
        <Box sx={{ my: 2 }}>
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
          <List sx={{ maxHeight: 300, overflowY: 'auto', mt: 1 }}>
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

      {/* 加载动画 */}
      {isLoading && <CircularProgress sx={{ mt: 2 }} />}
    </PlayerContainer>
  );
}

export default SpotifyPlayer;
