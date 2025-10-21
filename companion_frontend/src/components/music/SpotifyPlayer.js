// src/components/music/SpotifyPlayer.js (究极完全体，一个字符都不少！)

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Button, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText, IconButton,
  Grid, Card, CardContent, CardActionArea, Fab,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { styled } from '@mui/system';
import { FaSpotify, FaSearch, FaPlus, FaArrowLeft, FaPlay } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

import { getSpotifyAuthUrl, spotifyProxyRequest, getSpotifyAccessToken } from '../../api/musicApi';
import usePlayerStore from '../../stores/playerStore'; 

// --- 样式组件 ---
const PlayerContainer = styled(Box)(({ theme }) => ({
  position: 'relative', // 改为相对定位，让FAB可以相对于它定位
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  minHeight: '450px', // 确保有足够空间
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden', // 防止动画溢出
}));

const SpotifyButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1DB954',
  color: 'white',
  fontWeight: 'bold',
  padding: theme.spacing(1.5, 4),
  borderRadius: '50px',
  '&:hover': { backgroundColor: '#1ED760' },
}));

const SearchFab = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  backgroundColor: '#1DB954',
  color: 'white',
  '&:hover': { backgroundColor: '#1ED760' },
}));

const PlaylistCard = styled(Card)(({ theme }) => ({
  height: '100%',
  backgroundColor: 'rgba(128, 128, 128, 0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  }
}));

// --- 动画效果 ---
const viewVariants = {
  initial: { opacity: 0, x: 50 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -50 },
};
const transition = { type: 'tween', ease: 'easeInOut', duration: 0.3 };

// --- 主组件 ---
function SpotifyPlayer({ user, isSpotifyLinked }) {
  // --- 状态管理 ---
  const [view, setView] = useState('loading'); // 'loading','unlinked','playlists','detail','search','error'
  const [error, setError] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [addPlaylistId, setAddPlaylistId] = useState(''); // 用于搜索结果添加

  // --- 从 Zustand Store 获取播放能力 ---
  const { initializeSpotifyPlayer, playSpotifyTrack } = usePlayerStore();

  // --- 数据获取与处理 ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const tokenResponse = await getSpotifyAccessToken();
      initializeSpotifyPlayer(tokenResponse.data.access_token);

      const meResponse = await spotifyProxyRequest('me');
      const spotifyUserId = meResponse.data.id;

      const plResponse = await spotifyProxyRequest('me/playlists');
      let userPlaylists = plResponse.data.items || [];

      if (userPlaylists.length === 0) {
        const createResponse = await spotifyProxyRequest(`users/${spotifyUserId}/playlists`, 'post', {
          name: '来自陪伴空间的收藏', public: false, description: '由陪伴空间自动创建'
        });
        userPlaylists.push(createResponse.data);
      }
      
      setPlaylists(userPlaylists);
      if (userPlaylists.length > 0) {
        setAddPlaylistId(userPlaylists[0].id); // 默认选中第一个歌单
      }
      setView('playlists');
    } catch (err) {
      setError("加载您的 Spotify 数据失败，请尝试刷新。");
      setView('error');
    } finally {
      setIsLoading(false);
    }
  }, [initializeSpotifyPlayer]);

  useEffect(() => {
    if (isSpotifyLinked) {
      setView('loading');
      fetchInitialData();
    } else {
      setView('unlinked');
    }
  }, [isSpotifyLinked, fetchInitialData]);

  // --- 事件处理函数 ---
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await getSpotifyAuthUrl(user.qq_id);
      window.location.href = response.data.auth_url;
    } catch (err) {
      setError('无法获取授权链接，请稍后再试。');
      setIsLoading(false);
    }
  };

  const handlePlaylistClick = async (playlist) => {
    setSelectedPlaylist(playlist);
    setView('detail');
    setIsLoading(true);
    setError('');
    try {
      const response = await spotifyProxyRequest(`playlists/${playlist.id}/tracks`);
      setTracks(response.data.items.filter(item => item.track)); // 过滤掉无效的track
    } catch (err) { 
      setError("无法加载歌单曲目"); 
    } finally { 
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
      const params = { q: searchTerm, type: 'track', limit: 20 };
      const response = await spotifyProxyRequest('search', 'get', params);
      const items = response.data?.tracks?.items;
      if (items && items.length > 0) {
        setSearchResults(items);
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
    if (!addPlaylistId) {
      setError("请先选择一个要添加到的播放列表");
      return;
    }
    setError('');
    try {
      const endpoint = `playlists/${addPlaylistId}/tracks`;
      await spotifyProxyRequest(endpoint, 'post', { uris: [trackUri] });
      alert('添加成功！');
    } catch (err) {
      setError("添加到播放列表失败");
    }
  };

  // --- UI 渲染逻辑 ---
  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><CircularProgress /></Box>;
      
      case 'unlinked':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <FaSpotify size={50} color="#1DB954" style={{ marginBottom: 16 }} />
            <Typography variant="h5" gutterBottom>连接您的 Spotify 账号</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>同步您的歌单与收藏，开启音乐之旅。</Typography>
            <SpotifyButton onClick={handleConnect} startIcon={<FaSpotify />} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : '立即连接'}
            </SpotifyButton>
          </Box>
        );
        
      case 'error':
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><Alert severity="error">{error}</Alert></Box>;
      
      case 'playlists':
        return (
          <>
            <Typography variant="h5" gutterBottom>我的 Spotify 歌单</Typography>
            <Grid container spacing={2} sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
              {isLoading ? <CircularProgress /> : playlists.map(p => (
                <Grid item xs={6} md={4} key={p.id}>
                  <PlaylistCard>
                    <CardActionArea onClick={() => handlePlaylistClick(p)} sx={{ p: 2, height: '100%' }}>
                      <Typography noWrap fontWeight="bold">{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.tracks.total} 首</Typography>
                    </CardActionArea>
                  </PlaylistCard>
                </Grid>
              ))}
            </Grid>
            <SearchFab onClick={() => setView('search')}><FaSearch /></SearchFab>
          </>
        );

      case 'detail':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <IconButton onClick={() => setView('playlists')}><FaArrowLeft /></IconButton>
              <Typography variant="h6" noWrap>{selectedPlaylist?.name}</Typography>
            </Box>
            <List sx={{ width: '100%', overflowY: 'auto', flexGrow: 1 }}>
              {isLoading ? <Box sx={{textAlign:'center'}}><CircularProgress /></Box> : tracks.map(({ track }) => (
                <ListItem key={track.id} secondaryAction={
                  <IconButton edge="end" title="播放" onClick={() => playSpotifyTrack(track.uri)}><FaPlay /></IconButton>
                }>
                  <ListItemText primary={track.name} secondary={track.artists.map(a => a.name).join(', ')} />
                </ListItem>
              ))}
            </List>
          </>
        );

      case 'search':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <IconButton onClick={() => setView('playlists')}><FaArrowLeft /></IconButton>
               <Typography variant="h6">搜索并添加音乐</Typography>
            </Box>
            <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField fullWidth size="small" variant="outlined" label="搜索歌曲或艺术家" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <IconButton type="submit" color="primary" disabled={isSearching}>{isSearching ? <CircularProgress size={24} /> : <FaSearch />}</IconButton>
            </Box>
            {error && <Alert severity="warning" sx={{mb: 1}} onClose={() => setError('')}>{error}</Alert>}
            {searchResults.length > 0 && (
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>添加到歌单</InputLabel>
                <Select value={addPlaylistId} label="添加到歌单" onChange={(e) => setAddPlaylistId(e.target.value)}>
                  {playlists.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <List sx={{ width: '100%', overflowY: 'auto', flexGrow: 1 }}>
              {searchResults.map(track => (
                <ListItem key={track.id} secondaryAction={
                  <Box>
                    <IconButton title="播放" onClick={() => playSpotifyTrack(track.uri)}><FaPlay /></IconButton>
                    <IconButton title="添加到歌单" onClick={() => handleAddToPlaylist(track.uri)}><FaPlus /></IconButton>
                  </Box>
                }>
                  <ListItemText primary={track.name} secondary={track.artists.map(a => a.name).join(', ')} />
                </ListItem>
              ))}
            </List>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <PlayerContainer>
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          variants={viewVariants}
          initial="initial" animate="in" exit="out"
          transition={transition}
          style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </PlayerContainer>
  );
}

export default SpotifyPlayer;
