// src/components/GlobalPlayer.js (进度条修复版)

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

  // VVVV [核心修改] VVVV
  // 1. 创建一个布尔值，判断歌曲时长是否已经加载完毕
  const isDurationReady = trackInfo.duration > 0;
  // ^^^^ [核心修改结束] ^^^^

  const handleSeek = (event, newValue) => seek(newValue);

  const PlaybackModeIcon = () => {
    // (保持不变)
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
              <Slider 
                size="small" 
                value={currentTime} 
                // VVVV [核心修改] VVVV
                // 2. 如果时长准备好了，max 就用真实时长；否则，用一个安全的默认值（比如1）
                max={isDurationReady ? trackInfo.duration : 1} 
                // 3. 在时长准备好之前，禁用Slider，用户不可拖动
                disabled={!isDurationReady}
                // ^^^^ [核心修改结束] ^^^^
                onChange={handleSeek} 
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
                <Typography variant="caption" color="text.secondary">{formatTime(currentTime)}</Typography>
                {/* VVVV [核心修改] VVVV */}
                {/* 4. 只有在时长准备好后，才显示总时长 */}
                <Typography variant="caption" color="text.secondary">
                  {isDurationReady ? formatTime(trackInfo.duration) : '--:--'}
                </Typography>
                {/* ^^^^ [核心修改结束] ^^^^ */}
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
          <CollapsedButton /* (保持不变) */ >
            <FaMusic size={24} />
          </CollapsedButton>
        )
      )}
    </AnimatePresence>
  );
}

export default GlobalPlayer;
