// src/components/GlobalPlayer.js

import React from 'react';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { styled } from '@mui/system';
import { FaPlay, FaPause, FaStepForward, FaStepBackward } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

import usePlayerStore from '../stores/playerStore';

const PlayerBar = styled(motion.div)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '70px',
  backgroundColor: 'rgba(25, 25, 35, 0.85)',
  backdropFilter: 'blur(10px)',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  zIndex: 1301, // 比 MUI 的 Modal z-index 高一点
  boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
}));

function GlobalPlayer() {
  // 从全局 store 获取所有需要的信息和控制函数
  const { isActive, isPlaying, trackInfo, progress, togglePlay } = usePlayerStore();

  if (!isActive) {
    return null; // 如果播放器未激活，不渲染任何东西
  }

  return (
    <AnimatePresence>
      <PlayerBar
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        <Box sx={{ width: '50px', height: '50px', bgcolor: 'grey.800', borderRadius: 1, mr: 2 }}>
          {/* 这里可以放专辑封面 */}
        </Box>
        
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          <Typography noWrap fontWeight="bold">{trackInfo.name}</Typography>
          <Typography noWrap variant="caption" color="grey.400">{trackInfo.artist}</Typography>
          <Slider
            size="small"
            value={progress * 100}
            // (可以添加拖动进度条的逻辑)
            sx={{ p: '0 !important', height: 4, mt: 0.5 }}
          />
        </Box>
        
        <Box>
          <IconButton color="inherit">{/* <FaStepBackward /> */}</IconButton>
          <IconButton color="inherit" onClick={togglePlay} sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.1)' }}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </IconButton>
          <IconButton color="inherit">{/* <FaStepForward /> */}</IconButton>
        </Box>
      </PlayerBar>
    </AnimatePresence>
  );
}

export default GlobalPlayer;
