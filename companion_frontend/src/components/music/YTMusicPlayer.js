// 2. YTMusicPlayer.js - 修复溢出问题
// ========================================

import React, { useState } from 'react';
import { 
  Box, Typography, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText, IconButton,
  Avatar, ListItemAvatar
} from '@mui/material';
import { styled } from '@mui/system';
import { FaSearch, FaPlay } from 'react-icons/fa';

import { searchYouTubeMusic } from '../../api/musicApi';
import usePlayerStore from '../../stores/playerStore'; 

const PlayerContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
  // 【新增】手机端优化
  '@media (max-width: 600px)': {
    padding: theme.spacing(2),
    minHeight: '300px',
  }
}));

function YTMusicPlayer({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const { playYouTubeTrack } = usePlayerStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setError('');

    try {
      const response = await searchYouTubeMusic(searchTerm);
      const validResults = response.data.filter(item => item.videoId);
      
      if (validResults.length > 0) {
        setSearchResults(validResults);
      } else {
        setError("未找到匹配的音乐,请尝试更换关键词。");
      }
    } catch (err) {
      setError("搜索服务发生错误,请稍后再试。");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handlePlayClick = (songData) => {
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
      return <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>输入关键词,享受免费的音乐搜索吧!</Typography>;
    }

    return (
      <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {searchResults.map((song) => (
          <ListItem 
            key={song.videoId}
            sx={{ 
              paddingRight: 1,
              gap: 1,
              '&:hover': { backgroundColor: 'action.hover' },
              // 【关键修复】强制最小宽度为0,允许子元素收缩
              minWidth: 0,
            }}
          >
            <ListItemAvatar sx={{ minWidth: 0, flexShrink: 0 }}>
              <Avatar 
                src={song.thumbnails ? song.thumbnails[0].url : ''} 
                variant="rounded"
                sx={{ 
                  width: 48, 
                  height: 48,
                  // 【新增】手机端缩小头像
                  '@media (max-width: 600px)': {
                    width: 40,
                    height: 40,
                  }
                }}
              />
            </ListItemAvatar>
            
            {/* 【关键修复】文本容器必须有 minWidth: 0 和 flex: 1 */}
            <Box sx={{ 
              flex: 1, 
              minWidth: 0, // 这是关键!
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden', // 防止溢出
            }}>
              <Typography 
                noWrap 
                sx={{ 
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  '@media (max-width: 600px)': {
                    fontSize: '0.875rem',
                  }
                }}
              >
                {song.title}
              </Typography>
              <Typography 
                noWrap 
                variant="body2" 
                color="text.secondary"
                sx={{
                  '@media (max-width: 600px)': {
                    fontSize: '0.75rem',
                  }
                }}
              >
                {song.artists ? song.artists.map(a => a.name).join(', ') : '未知艺术家'}
              </Typography>
            </Box>

            {/* 【新增】时长标签(手机端隐藏) */}
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                flexShrink: 0,
                mx: 1,
                display: { xs: 'none', sm: 'block' } // 手机端隐藏
              }}
            >
              {song.duration}
            </Typography>

            <IconButton 
              onClick={() => handlePlayClick(song)}
              sx={{ 
                flexShrink: 0,
                padding: { xs: '6px', sm: '8px' }
              }}
              size="small"
            >
              <FaPlay size={14} />
            </IconButton>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <PlayerContainer>
      <Typography 
        variant="h5" 
        gutterBottom
        sx={{
          '@media (max-width: 600px)': {
            fontSize: '1.25rem',
          }
        }}
      >
        自由畅听 (YouTube Music)
      </Typography>
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
      <Box sx={{ flexGrow: 1, minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
        {renderResults()}
      </Box>
    </PlayerContainer>
  );
}

export default YTMusicPlayer;
