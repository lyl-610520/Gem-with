// src/components/GlobalPlayer.js (功能增强版)

import React from 'react';
import { Box, Typography, IconButton, Slider, Avatar } from '@mui/material';
import { styled } from '@mui/system';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaMusic } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

import usePlayerStore from '../stores/playerStore';

const PlayerBar = styled(motion.div)(({ theme }) => ({
    position: 'fixed',
    bottom: 0,
    left: '50%', // 从中间开始
    transform: 'translateX(-50%)', // 水平居中
    width: 'calc(100% - 32px)', // 左右留白
    maxWidth: '500px', // 最大宽度
    height: '70px',
    backgroundColor: 'rgba(25, 25, 35, 0.85)',
    backdropFilter: 'blur(10px)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    zIndex: 1301, 
    boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px 12px 0 0', // 圆角
}));

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function GlobalPlayer() {
  const { isActive, isPlaying, trackInfo, currentTime, togglePlay, seek } = usePlayerStore();

  if (!isActive) {
    return null;
  }

  const progressPercent = trackInfo.duration > 0 ? (currentTime / trackInfo.duration) * 100 : 0;

  return (
    <AnimatePresence>
      <PlayerBar
        initial={{ y: '120%' }}
        animate={{ y: 0 }}
        exit={{ y: '120%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        <Avatar variant="rounded" sx={{ width: 50, height: 50, bgcolor: 'grey.800', mr: 2 }}>
          {trackInfo.albumCover ? <img src={trackInfo.albumCover} alt={trackInfo.name} width="100%" /> : <FaMusic />}
        </Avatar>
        
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Typography noWrap fontWeight="bold">{trackInfo.name}</Typography>
          <Typography noWrap variant="caption" color="grey.400">{trackInfo.artist}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" sx={{ minWidth: '35px' }}>{formatTime(currentTime)}</Typography>
            <Slider
              size="small"
              value={progressPercent}
              onChange={(_, value) => {
                const newTime = (value / 100) * trackInfo.duration;
                seek(newTime);
              }}
              sx={{ p: '0 !important', height: 4 }}
            />
            <Typography variant="caption" sx={{ minWidth: '35px' }}>{formatTime(trackInfo.duration)}</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
          <IconButton color="inherit" size="small">{/* <FaStepBackward /> */}</IconButton>
          <IconButton color="inherit" onClick={togglePlay} sx={{ mx: 0.5, bgcolor: 'rgba(255,255,255,0.1)' }}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </IconButton>
          <IconButton color="inherit" size="small">{/* <FaStepForward /> */}</IconButton>
        </Box>
      </PlayerBar>
    </AnimatePresence>
  );
}

export default GlobalPlayer;
