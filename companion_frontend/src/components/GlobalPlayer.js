// src/components/GlobalPlayer.js (布局优化版)

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { styled } from '@mui/system';

import { 
  FaPlay, FaPause, FaStepBackward, FaStepForward, 
  FaRedo, FaRandom, FaListOl 
} from 'react-icons/fa';

import usePlayerStore from '../stores/playerStore';

const PlayerContainer = styled(motion.div)(({ theme }) => ({
  position: 'fixed',
  // [优化1] 调整 bottom 距离，在手机上更贴合底部，视觉效果更好
  bottom: 16, 
  left: '50%',
  transform: 'translateX(-50%)',
  // [优化2] 使用 vw (视口宽度) 和 max-width 结合，实现完美的响应式
  width: '90vw',      // 在所有设备上，宽度都是屏幕可见宽度的90%
  maxWidth: '500px',  // 但在PC等大屏幕上，最大宽度不超过500px，保持精致
  zIndex: 1500,
  
  // 霜冻玻璃效果 (保持不变)
  background: theme.palette.mode === 'dreamy' 
    ? 'rgba(38, 43, 64, 0.6)' 
    : 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.mode === 'dreamy' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
  padding: theme.spacing(1, 2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const formatTime = (seconds) => {
  const flooredSeconds = Math.floor(seconds || 0);
  const min = Math.floor(flooredSeconds / 60);
  const sec = flooredSeconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

function GlobalPlayer() {
  const { 
    isActive, isPlaying, trackInfo, currentTime,
    togglePlay, seek, playbackMode, togglePlaybackMode 
  } = usePlayerStore();

  const handleSeek = (event, newValue) => {
    seek(newValue);
  };

  const PlaybackModeIcon = () => {
    switch (playbackMode) {
      case 'loop': return <FaRedo size={16} title="单曲循环" />;
      case 'shuffle': return <FaRandom size={16} title="随机播放" />;
      default: return <FaListOl size={16} title="列表循环" />;
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <PlayerContainer
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 播放控件 */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" disabled>
              <FaStepBackward />
            </IconButton>
            <IconButton onClick={togglePlay} color="primary" sx={{ mx: 0.5 }}>
              {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
            </IconButton>
            <IconButton size="small" disabled>
              <FaStepForward />
            </IconButton>
          </Box>

          {/* 歌曲信息与进度条 */}
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography noWrap variant="body2" fontWeight="bold">
              {trackInfo.name || '未选择歌曲'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
              <Slider
                size="small"
                value={currentTime}
                max={trackInfo.duration || 100}
                onChange={handleSeek}
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {formatTime(trackInfo.duration)}
              </Typography>
            </Box>
          </Box>
          
          {/* 播放模式切换 */}
          <IconButton size="small" onClick={togglePlaybackMode}>
            <PlaybackModeIcon />
          </IconButton>
        </PlayerContainer>
      )}
    </AnimatePresence>
  );
}

export default GlobalPlayer;
