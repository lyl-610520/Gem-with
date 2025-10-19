// src/components/GlobalPlayer.js (全新美化版)

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Typography, IconButton, Slider } from '@mui/material';
import { styled } from '@mui/system';

// 引入需要的图标
import { 
  FaPlay, FaPause, FaStepBackward, FaStepForward, 
  FaRedo, FaRandom, FaListOl 
} from 'react-icons/fa';

// 引入我们的全局播放器状态管理器
import usePlayerStore from '../stores/playerStore';

// --- 样式定义 ---

// 定义播放器主容器的样式，使用 motion.div 以支持动画
const PlayerContainer = styled(motion.div)(({ theme }) => ({
  // 1. 布局：固定在屏幕底部，水平居中
  position: 'fixed',
  bottom: 24, // 距离底部24px
  left: '50%',
  transform: 'translateX(-50%)', // 水平居中 hack
  width: 'calc(100% - 48px)', // 宽度为屏幕宽度减去两侧边距
  maxWidth: '500px', // 在大屏幕上，限制最大宽度，避免过长
  zIndex: 1500, // 设置一个较高的 z-index，确保它在所有内容的上方
  
  // 2. 美学：实现霜冻玻璃效果
  // 根据主题模式设置不同的半透明背景色
  background: theme.palette.mode === 'dreamy' 
    ? 'rgba(38, 43, 64, 0.6)' // 深色模式下的背景
    : 'rgba(255, 255, 255, 0.6)', // 浅色模式下的背景
  backdropFilter: 'blur(20px) saturate(180%)', // 核心：模糊背景内容
  WebkitBackdropFilter: 'blur(20px) saturate(180%)', // 兼容 Safari 浏览器
  
  // 3. 细节：边框、圆角和阴影
  borderRadius: theme.shape.borderRadius, // 使用主题定义的圆角
  border: `1px solid ${theme.palette.mode === 'dreamy' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)', // 添加柔和的阴影增加立体感
  
  // 4. 内部布局
  padding: theme.spacing(1, 2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

// --- 辅助函数 ---

/**
 * 将秒数格式化为 MM:SS 格式的字符串
 * @param {number} seconds - 总秒数
 * @returns {string} 格式化后的时间字符串
 */
const formatTime = (seconds) => {
  const flooredSeconds = Math.floor(seconds || 0);
  const min = Math.floor(flooredSeconds / 60);
  const sec = flooredSeconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};


function GlobalPlayer() {
  // 从 Zustand store 中获取所有需要的状态和操作函数
  const { 
    isActive, isPlaying, trackInfo, currentTime,
    togglePlay, seek, playbackMode, togglePlaybackMode 
  } = usePlayerStore();

  // Slider 组件数值变化时的回调函数
  const handleSeek = (event, newValue) => {
    seek(newValue);
  };

  // 这是一个小型“子组件”，根据当前的播放模式返回对应的图标
  const PlaybackModeIcon = () => {
    switch (playbackMode) {
      case 'loop': return <FaRedo size={16} title="单曲循环" />;
      case 'shuffle': return <FaRandom size={16} title="随机播放" />;
      default: return <FaListOl size={16} title="列表循环" />;
    }
  };

  return (
    // AnimatePresence 用于实现组件出现和消失时的动画
    <AnimatePresence>
      {/* 只有当播放器激活时，才渲染播放器组件 */}
      {isActive && (
        <PlayerContainer
          // 定义入场动画：从下方100px、透明度为0的位置开始
          initial={{ y: 100, opacity: 0 }}
          // 动画目标：回到原位(y:0)、完全不透明
          animate={{ y: 0, opacity: 1 }}
          // 定义出场动画：回到下方100px、透明度为0的位置
          exit={{ y: 100, opacity: 0 }}
          // 设置动画类型为 spring (弹簧)，效果更自然
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 左侧：播放控制按钮 */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* 上一曲按钮 (功能暂未实现，设为禁用) */}
            <IconButton size="small" disabled>
              <FaStepBackward />
            </IconButton>
            {/* 播放/暂停按钮 */}
            <IconButton onClick={togglePlay} color="primary" sx={{ mx: 0.5 }}>
              {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
            </IconButton>
            {/* 下一曲按钮 (功能暂未实现，设为禁用) */}
            <IconButton size="small" disabled>
              <FaStepForward />
            </IconButton>
          </Box>

          {/* 中间：歌曲信息与进度条 */}
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
                max={trackInfo.duration || 100} // 如果时长未加载完成，给一个默认最大值
                onChange={handleSeek} // 拖动或点击时触发 seek
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {formatTime(trackInfo.duration)}
              </Typography>
            </Box>
          </Box>
          
          {/* 右侧：播放模式切换按钮 */}
          <IconButton size="small" onClick={togglePlaybackMode}>
            <PlaybackModeIcon />
          </IconButton>
        </PlayerContainer>
      )}
    </AnimatePresence>
  );
}

export default GlobalPlayer;
