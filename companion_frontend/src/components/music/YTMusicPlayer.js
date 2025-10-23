// src/components/music/YTMusicPlayer.js (畅听模式实现)

import React, { useState } from 'react';
import { 
  Box, Typography, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText, IconButton,
  Avatar
} from '@mui/material';
import { styled } from '@mui/system';
import { FaSearch, FaPlay } from 'react-icons/fa';

import axios from 'axios'; // 直接使用 axios 来调用我们的后端接口
import usePlayerStore from '../../stores/playerStore'; 

const PlayerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
}));

function YTMusicPlayer({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // 从 Zustand Store 获取播放能力
  const { playYouTubeTrack } = usePlayerStore(); // <--- 假设我们很快会创建这个函数

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setError('');

    try {
      // 调用我们后端的 YT Music 搜索接口
      const response = await axios.get(`/ytmusic/search?q=${encodeURIComponent(searchTerm)}`);
      
      const results = response.data.map(item => ({
        // 核心数据转换，确保前端拿到的是干净的数据
        videoId: item.videoId,
        title: item.title,
        artist: item.artists ? item.artists.map(a => a.name).join(', ') : '未知艺术家',
        duration: item.duration, // 直接使用 ytmusicapi 返回的格式化字符串 (例如 "4:19")
        thumbnail: item.thumbnails ? item.thumbnails[0].url : null, // 取最高质量的封面
      }));

      if (results.length > 0) {
        setSearchResults(results);
      } else {
        setError("未找到匹配的音乐，请尝试更换关键词。");
      }
    } catch (err) {
      setError("搜索服务发生错误，请稍后再试。");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // 渲染搜索结果列表
  const renderResults = () => {
    if (isSearching) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    if (error) {
      return <Alert severity="warning" sx={{ m: 2 }}>{error}</Alert>;
    }
    if (searchResults.length === 0) {
      return <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>输入关键词，享受免费的音乐搜索吧！</Typography>;
    }

    return (
      <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {searchResults.map((song) => (
          <ListItem 
            key={song.videoId}
            secondaryAction={
              <IconButton edge="end" title="播放" onClick={() => playYouTubeTrack(song.videoId)}>
                <FaPlay />
              </IconButton>
            }
          >
            <Avatar 
                src={song.thumbnail} 
                variant="rounded" 
                sx={{ width: 40, height: 40, mr: 2 }}
            />
            <ListItemText 
              primary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography component="span" noWrap sx={{ maxWidth: '70%' }}>{song.title}</Typography>
                  <Typography component="span" variant="caption" color="text.secondary">{song.duration}</Typography>
                </Box>
              }
              secondary={song.artist} 
            />
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <PlayerContainer>
      <Typography variant="h5" gutterBottom>自由畅听 (YouTube Music)</Typography>
      
      {/* 搜索框 */}
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField 
          fullWidth
          size="small"
          variant="outlined"
          label="搜索歌曲/歌手/专辑"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IconButton type="submit" color="primary" disabled={isSearching}>
          <FaSearch />
        </IconButton>
      </Box>

      {/* 结果区域 */}
      <Box sx={{ flexGrow: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
        {renderResults()}
      </Box>
    </PlayerContainer>
  );
}

export default YTMusicPlayer;
