// src/components/music/LocalPlayer.js (最终响应式版本)

import React, { useState, useEffect, useRef } from 'react';
// 【第1步】从 @mui/material 导入 Box 组件
import { Box, Typography, List, ListItem, ListItemText, IconButton, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaTrash, FaUpload } from 'react-icons/fa';

import { getLocalPlaylist, uploadLocalMusic, deleteLocalMusic } from '../../api/musicApi';
import usePlayerStore from '../../stores/playerStore';

const PlayerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
}));

// 【第2步】为 UploadButton 添加响应式样式
const UploadButton = styled('label')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center', // 添加此项，确保图标在按钮内居中
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
  // VVVV ============== 【这里是新增的响应式样式】 ============== VVVV
  [theme.breakpoints.down('sm')]: { // 当屏幕宽度小于 sm 断点时 (手机)
    minWidth: '48px',   // 设置固定尺寸
    width: '48px',
    height: '48px',
    padding: 0,         // 移除内边距
    borderRadius: '50%',// 变成圆形
  },
  // ^^^^ ======================================================= ^^^^
}));

function LocalPlayer({ user }) {
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const { playLocalSong, trackInfo, isPlaying, togglePlay } = usePlayerStore();

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
        setError('上传失败：请选择一个有效的音频文件 (如 MP3, M4A, WAV)。');
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadLocalMusic(file);
      await fetchPlaylist();
    } catch (err) {
      setError(err.response?.data?.error || '上传失败，请检查文件或稍后再试。');
    } finally {
      setUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (songId, e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这首歌曲吗？')) {
      try {
        await deleteLocalMusic(songId);
        setPlaylist(prev => prev.filter(song => song.id !== songId));
      } catch (err) {
        setError('删除失败，请稍后再试。');
      }
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <PlayerContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>我的个人曲库</Typography>
        <UploadButton htmlFor="music-upload">
          {uploading ? <CircularProgress size={20} color="inherit" /> : <FaUpload />}
          {/* 【第3步】用 Box 包裹文字并添加 sx 属性 */}
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            上传音乐
          </Box>
        </UploadButton>
        <input 
          id="music-upload" 
          type="file" 
          accept="audio/*" // 优化：只接受音频文件
          hidden 
          onChange={handleFileUpload}
          ref={fileInputRef}
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
                selected={trackInfo.id === song.id}
                onClick={() => playLocalSong(song)}
              >
                {/* 优化：播放/暂停按钮现在只在当前歌曲上显示 */}
                <IconButton color="primary">
                  {isPlaying && trackInfo.id === song.id ? <FaPause /> : <FaPlay />}
                </IconButton>
                <ListItemText primary={song.title} secondary={song.artist || '未知艺术家'} />
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
