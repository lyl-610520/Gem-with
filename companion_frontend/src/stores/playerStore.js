// src/components/music/LocalPlayer.js (功能完整版)

import React, 'react';
import { Box, Typography, List, ListItem, ListItemText, IconButton, CircularProgress, Alert, useTheme } from '@mui/material';
import { styled } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaTrash, FaUpload } from 'react-icons/fa';

import { getLocalPlaylist, uploadLocalMusic, deleteLocalMusic } from '../../api/musicApi';
import usePlayerStore from '../../stores/playerStore';

const PlayerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
}));

const UploadButton = styled('label')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5, 3),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 15px ${theme.palette.primary.main}40`,
  },
}));

function LocalPlayer({ user }) {
  const [playlist, setPlaylist] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const theme = useTheme();
  
  // 从全局 store 中获取我们需要的状态和 actions
  const { playLocalSong, trackInfo, isPlaying, source } = usePlayerStore();
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  React.useEffect(() => {
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getLocalPlaylist();
      setPlaylist(data);
    } catch (err) {
      setError('无法加载您的个人曲库，请稍后再试。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      await uploadLocalMusic(file);
      await fetchPlaylist(); // 上传成功后刷新列表
    } catch (err) {
      setError(err.response?.data?.error || '上传失败，请检查文件或稍后再试。');
      console.error(err);
    } finally {
      setUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (songId, e) => {
    e.stopPropagation(); // 防止点击删除时触发播放
    if (window.confirm('确定要删除这首歌曲吗？')) {
      try {
        await deleteLocalMusic(songId);
        setPlaylist(prev => prev.filter(song => song.id !== songId));
      } catch (err) {
        setError('删除失败，请稍后再试。');
        console.error(err);
      }
    }
  };
  
  const handleSongClick = (song) => {
    // 如果点击的已经是当前播放的歌曲，则切换播放/暂停
    // 否则，开始播放这首新歌
    if (source === 'local' && trackInfo.id === song.id) {
        togglePlay();
    } else {
        playLocalSong(song);
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <PlayerContainer theme={theme}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>我的个人曲库</Typography>
        <UploadButton htmlFor="music-upload" theme={theme}>
          {uploading ? <CircularProgress size={20} color="inherit" /> : <FaUpload />}
          上传音乐
        </UploadButton>
        <input 
          id="music-upload" 
          type="file" 
          accept="audio/*"
          hidden 
          onChange={handleFileUpload}
          ref={fileInputRef}
          disabled={uploading}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        您的曲库容量: {playlist.length} / 5 首
      </Typography>

      <List>
        <AnimatePresence>
          {playlist.length > 0 ? playlist.map((song) => (
            <motion.div
              key={song.id}
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
            >
              <ListItem
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={(e) => handleDelete(song.id, e)}>
                    <FaTrash />
                  </IconButton>
                }
                button
                selected={trackInfo.id === song.id && source === 'local'}
                onClick={() => handleSongClick(song)}
              >
                <IconButton color="primary" sx={{ mr: 2 }}>
                  {isPlaying && trackInfo.id === song.id && source === 'local' ? <FaPause /> : <FaPlay />}
                </IconButton>
                <ListItemText primary={song.title} secondary={song.artist} />
              </ListItem>
            </motion.div>
          )) : (
            <Typography sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
              您的曲库是空的，点击右上角上传第一首歌吧！
            </Typography>
          )}
        </AnimatePresence>
      </List>
    </PlayerContainer>
  );
}

export default LocalPlayer;
