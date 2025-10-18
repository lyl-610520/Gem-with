// src/components/music/MusicModeToggle.js (最终修正版 v2)

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
  padding: '10px 25px',
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
  // 使用 calc() 需要是字符串
  width: 'calc(50% - 6px)',
  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  borderRadius: '999px',
  zIndex: 1,
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
});

// --- VVVV 核心修复 VVVV ---
// 将 prop 'setMode' 重命名为 'onModeChange'，这是 React 的标准实践
const MusicModeToggle = ({ mode, onModeChange }) => {
// --- ^^^^ 修复结束 ^^^^ ---
  return (
    <ToggleWrapper>
      <ToggleContainer>
        <ActiveBackground
          layout
          initial={false}
          animate={{ x: mode === 'spotify' ? '0%' : '100%' }} // 使用百分比字符串更安全
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        {/* --- VVVV 核心修复 VVVV --- */}
        <ToggleOption isActive={mode === 'spotify'} onClick={() => onModeChange('spotify')}>
          <FaSpotify />
          Spotify Link
        </ToggleOption>
        <ToggleOption isActive={mode === 'local'} onClick={() => onModeChange('local')}>
          <FaMusic />
          Companion Player
        </ToggleOption>
        {/* --- ^^^^ 修复结束 ^^^^ --- */}
      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
