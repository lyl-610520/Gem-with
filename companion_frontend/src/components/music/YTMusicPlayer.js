// src/components/music/YTMusicPlayer.js (最终点火版)

import React, { useState } from 'react';
import { 
  Box, Typography, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText, IconButton,
  Avatar, ListItemAvatar
} from '@mui/material';
import { styled } from '@mui/system';
import { FaSearch, FaPlay } from 'react-icons/fa';

import { searchYouTubeMusic } from '../../api/musicApi'; // <--- 导入新的官方API
import usePlayerStore from '../../stores/playerStore'; 

// --- 样式组件 (保持不变) ---
const PlayerContainer = styled(Box)(({ theme }) => ({
  width: '100%', // <--- 新增
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
}));

// --- 主组件 ---
function YTMusicPlayer({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // VVVV [这就是“连接电线”的关键一步！] VVVV
  // 我们从 store 中，把 playYouTubeTrack 这个“点火”函数拿出来！
  const { playYouTubeTrack } = usePlayerStore();
  // ^^^^ [连接完毕！] ^^^^

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setError('');

    try {
      const response = await searchYouTubeMusic(searchTerm);
      
      // [健壮性优化] 过滤掉没有 videoId 的无效结果
      const validResults = response.data.filter(item => item.videoId);
      
      if (validResults.length > 0) {
        setSearchResults(validResults);
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
  
  // [新增] 点击播放按钮时调用的函数
  const handlePlayClick = (songData) => {
    // 我们需要把后端返回的原始数据，转换成 playYouTubeTrack 函数需要的格式
    const trackToPlay = {
        videoId: songData.videoId,
        title: songData.title,
        artist: songData.artists ? songData.artists.map(a => a.name).join(', ') : '未知艺术家',
        thumbnail: songData.thumbnails ? songData.thumbnails[0].url : null,
    };
    playYouTubeTrack(trackToPlay);
  };

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
      <List sx={{ overflowY: 'auto', flexGrow: 1, px: 1 }}>
        {searchResults.map((song) => (
          <ListItem 
            key={song.videoId}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">{song.duration}</Typography>
                {/* VVVV [这就是“点火”的那一下！] VVVV */}
                <IconButton edge="end" title="播放" onClick={() => handlePlayClick(song)}>
                  <FaPlay />
                </IconButton>
                {/* ^^^^ [点火成功！] ^^^^ */}
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar src={song.thumbnails ? song.thumbnails[0].url : ''} variant="rounded" />
            </ListItemAvatar>
            <ListItemText 
              sx={{ minWidth: 0, marginRight: 2 }} // <--- 新增
              primary={<Typography noWrap>{song.title}</Typography>}
              secondary={<Typography noWrap variant="body2" color="text.secondary">{song.artists ? song.artists.map(a => a.name).join(', ') : '未知艺术家'}</Typography>}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <PlayerContainer>
      <Typography variant="h5" gutterBottom>自由畅听 (YouTube Music)</Typography>
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField fullWidth size="small" variant="outlined" label="搜索歌曲/歌手/专辑" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <IconButton type="submit" color="primary" disabled={isSearching}><FaSearch /></IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
        {renderResults()}
      </Box>
    </PlayerContainer>
  );
}

export default YTMusicPlayer;
