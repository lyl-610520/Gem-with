// src/components/music/MusicModeToggle.js (三模式切换)

import React, { useMemo } from 'react';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { FaSpotify, FaMusic } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6"; // <--- 导入 YouTube 图标

const ToggleWrapper = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '40px',
});

const ToggleContainer = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  padding: '6px',
  backgroundColor: 'rgba(128, 128, 128, 0.15)',
  borderRadius: '999px',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
});

const ToggleOption = styled('div')(({ isActive }) => ({
  position: 'relative',
  padding: '10px 20px', // [修改] 稍微缩短间距以容纳第三个按钮
  fontSize: '1rem',
  fontWeight: 600,
  color: isActive ? '#FFFFFF' : 'rgba(128, 128, 128, 0.9)',
  zIndex: 2,
  transition: 'color 0.3s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}));

const ActiveBackground = styled(motion.div)({
  position: 'absolute',
  top: '6px',
  bottom: '6px',
  left: '6px',
  // [核心修改] 宽度改为 calc(33.333% - 4px) 来容纳三个选项
  width: 'calc(33.333% - 4px)',
  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  borderRadius: '999px',
  zIndex: 1,
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
});

const MusicModeToggle = ({ mode, onModeChange }) => {
  // VVVV [核心修复] VVVV
  // 我们为每个模式分配一个索引，计算位置变得极其简单可靠
  const xPosition = useMemo(() => {
    const modeIndex = { spotify: 0, local: 1, ytmusic: 2 };
    const index = modeIndex[mode] || 0;
    // 每个按钮宽度是100%，外加每个间隔的补偿 (4px * index)
    return `calc(${index * 100}% + ${index * 4}px)`;
  }, [mode]);
  // ^^^^ [修复结束] ^^^^

  // VVVV [核心修改] 修正 ActiveBackground 的 x 动画和 Option 的点击逻辑 VVVV
  const getXPosition = (currentMode) => {
    if (currentMode === 'spotify') return '0%';
    if (currentMode === 'local') return '100%';
    if (currentMode === 'ytmusic') return '200%';
    return '0%';
  };

  return (
    <ToggleWrapper>
      <ToggleContainer>
        <ActiveBackground
          layout
          initial={false}
          // [修正] 使用 calc() 配合百分比，确保三个选项之间的平滑移动
          animate={{ x: mode === 'spotify' ? '0%' : (mode === 'local' ? 'calc(100% + 4px)' : 'calc(200% + 8px)') }} 
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <ToggleOption isActive={mode === 'spotify'} onClick={() => onModeChange('spotify')}>
          <FaSpotify />
          Spotify
        </ToggleOption>
        <ToggleOption isActive={mode === 'local'} onClick={() => onModeChange('local')}>
          <FaMusic />
          Companion
        </ToggleOption>
        <ToggleOption isActive={mode === 'ytmusic'} onClick={() => onModeChange('ytmusic')}>
          <FaYoutube color="#FF0000" /> {/* YouTube 标志性的红色 */}
          畅听
        </ToggleOption>
      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
