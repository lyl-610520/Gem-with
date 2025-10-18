// src/components/music/MusicModeToggle.js (最终无错版 v3)

import React from 'react';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { FaSpotify } from "react-icons/fa";
import { FaMusic } from "react-icons/fa6";

const ToggleWrapper = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '40px',
});

// --- VVVV 核心修复 VVVV ---
// 移除了 ToggleContainer 上的 onClick 事件，因为它是不必要的且导致了错误
const ToggleContainer = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  padding: '6px',
  backgroundColor: 'rgba(128, 128, 128, 0.15)',
  borderRadius: '999px',
  // cursor: 'pointer', // 因为点击事件在子元素上，所以容器不需要手型指针
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
});
// --- ^^^^ 修复结束 ^^^^ ---

const ToggleOption = styled('div')(({ isActive }) => ({
  position: 'relative',
  padding: '10px 25px',
  fontSize: '1rem',
  fontWeight: 600,
  color: isActive ? '#FFFFFF' : 'rgba(128, 128, 128, 0.9)',
  zIndex: 2,
  transition: 'color 0.3s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer', // <--- 将手型指针移到这里，因为这里才是真正可点击的区域
}));

const ActiveBackground = styled(motion.div)({
  position: 'absolute',
  top: '6px',
  bottom: '6px',
  left: '6px',
  width: 'calc(50% - 6px)',
  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  borderRadius: '999px',
  zIndex: 1,
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
});

const MusicModeToggle = ({ mode, onModeChange }) => {
  return (
    <ToggleWrapper>
      <ToggleContainer>
        <ActiveBackground
          layout
          initial={false}
          animate={{ x: mode === 'spotify' ? '0%' : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <ToggleOption isActive={mode === 'spotify'} onClick={() => onModeChange('spotify')}>
          <FaSpotify />
          Spotify Link
        </ToggleOption>
        <ToggleOption isActive={mode === 'local'} onClick={() => onModeChange('local')}>
          <FaMusic />
          Companion Player
        </ToggleOption>
      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
