// MusicModeToggle.js (最终修复版，使用 layoutId)
// =======================================================

import React from 'react';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { FaSpotify, FaMusic } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";

// ToggleWrapper 和 ToggleContainer 保持不变
const ToggleWrapper = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '40px',
  padding: '0 16px',
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
  width: '100%',
  maxWidth: '500px',
});

// ToggleOption 保持不变
const ToggleOption = styled('div')(({ isActive }) => ({
  position: 'relative', // 【关键】需要 relative 定位来容纳绝对定位的背景
  padding: '10px 16px',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: isActive ? '#FFFFFF' : 'rgba(128, 128, 128, 0.9)',
  zIndex: 2,
  transition: 'color 0.3s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  flex: 1,
  '@media (max-width: 600px)': {
    fontSize: '0.85rem',
    padding: '8px 12px',
    '& svg': {
      fontSize: '0.9rem',
    }
  }
}));

// 【修改】背景组件现在变得非常简单
const ActiveBackground = styled(motion.div)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  borderRadius: '999px',
  zIndex: 1, // zIndex 比文字低
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
});

const MusicModeToggle = ({ mode, onModeChange }) => {
  return (
    <ToggleWrapper>
      <ToggleContainer>
        {/* 我们不再需要那个单独的、会移动的 ActiveBackground 了 */}
        
        <ToggleOption isActive={mode === 'spotify'} onClick={() => onModeChange('spotify')}>
          {/* 【关键】只有当这个选项是激活状态时，才渲染背景 */}
          {mode === 'spotify' && <ActiveBackground layoutId="active-pill" />}
          <FaSpotify />
          <span>Spotify</span>
        </ToggleOption>

        <ToggleOption isActive={mode === 'local'} onClick={() => onModeChange('local')}>
          {mode === 'local' && <ActiveBackground layoutId="active-pill" />}
          <FaMusic />
          <span>Companion</span>
        </ToggleOption>
        
        <ToggleOption isActive={mode === 'ytmusic'} onClick={() => onModeChange('ytmusic')}>
          {mode === 'ytmusic' && <ActiveBackground layoutId="active-pill" />}
          <FaYoutube color="#FF0000" />
          <span>畅听</span>
        </ToggleOption>

      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
