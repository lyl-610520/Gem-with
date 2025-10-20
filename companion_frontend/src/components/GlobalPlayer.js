// src/components/GlobalPlayer.js (播放条修复版)

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { styled } from '@mui/system';

import { 
  FaPlay, FaPause, FaStepBackward, FaStepForward, 
  FaRedo, FaRandom, FaListOl, FaMusic, FaChevronDown
} from 'react-icons/fa';

import usePlayerStore from '../stores/playerStore';

// --- 样式定义 (保持不变) ---
const PlayerContainer = styled(motion.div)(({ theme }) => ({
  position: 'fixed',
  bottom: 16,
  left: '5vw',
  right: '5vw',
  width: 'auto',
  maxWidth: '350px', 
  zIndex: 1500,
  background: theme.palette.mode === 'dreamy' 
    ? 'rgba(38, 43, 64, 0.7)' 
    : 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.mode === 'dreamy' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

const CollapsedButton = styled(motion.div)(({ theme }) => ({
  position: 'fixed',
  bottom: 16,
  left: 16,
  zIndex: 1500,
  width: 56,
  height: 56,
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  cursor: 'pointer',
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
    togglePlay, seek, playbackMode, togglePlaybackMode,
    isPlayerVisible, togglePlayerVisibility
  } = usePlayerStore();

  const handleSeek = (event, newValue) => seek(newValue);

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
        isPlayerVisible ? (
          <PlayerContainer
            key="player-expanded"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {/* 上方部分 (保持不变) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <IconButton size="small" onClick={togglePlayerVisibility} sx={{ alignSelf: 'flex-start' }}>
                <FaChevronDown />
              </IconButton>
              <Box sx={{ flexGrow: 1, textAlign: 'center', overflow: 'hidden', mr: 4 }}>
                <Typography noWrap fontWeight="bold">{trackInfo.name}</Typography>
                <Typography noWrap variant="caption" color="text.secondary">{trackInfo.artist}</Typography>
              </Box>
            </Box>

            {/* 中间：进度条 */}
            <Box sx={{ width: '100%', px: 1 }}>
              {/* VVVV [核心修复] VVVV */}
              <Slider
                size="small"
                value={currentTime}
                // 关键：直接将 max 绑定到 duration。移除 || 100 这个后备值。
                // 如果 duration 为 0，max 就是 0，这是正确的初始状态。
                // 当 duration 从服务器加载完毕后，这里会自动更新，确保进度条100%准确。
                max={trackInfo.duration}
                onChange={handleSeek}
                // 锦上添花：在不知道歌曲多长时（即 duration 为 0），禁用滑块，
                // 防止用户操作一个无效的进度条，让体验更专业。
                disabled={trackInfo.duration === 0}
              />
              {/* ^^^^ [修复结束] ^^^^ */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
                <Typography variant="caption" color="text.secondary">{formatTime(currentTime)}</Typography>
                <Typography variant="caption" color="text.secondary">{formatTime(trackInfo.duration)}</Typography>
              </Box>
            </Box>
            
            {/* 下方部分 (保持不变) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%' }}>
              <IconButton size="small" onClick={togglePlaybackMode}><PlaybackModeIcon /></IconButton>
              <IconButton size="small" disabled><FaStepBackward /></IconButton>
              <IconButton onClick={togglePlay} color="primary" sx={{ transform: 'scale(1.5)' }}>
                {isPlaying ? <FaPause /> : <FaPlay />}
              </IconButton>
              <IconButton size="small" disabled><FaStepForward /></IconButton>
              <Box sx={{ width: 40 }} />
            </Box>
          </PlayerContainer>
        ) : (
          <CollapsedButton
            key="player-collapsed"
            onClick={togglePlayerVisibility}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaMusic size={24} />
          </CollapsedButton>
        )
      )}
    </AnimatePresence>
  );
}

export default GlobalPlayer;
