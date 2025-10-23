// 1. MusicModeToggle.js - 修复按钮错位
// ========================================

import React from 'react';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { FaSpotify, FaMusic } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";

const ToggleWrapper = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '40px',
  // 【新增】手机端优化
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
  // 【新增】手机端全宽
  width: '100%',
  maxWidth: '500px',
});

const ToggleOption = styled('div')(({ isActive }) => ({
  position: 'relative',
  padding: '10px 16px',
  fontSize: '0.95rem', // 【修改】稍微缩小字体
  fontWeight: 600,
  color: isActive ? '#FFFFFF' : 'rgba(128, 128, 128, 0.9)',
  zIndex: 2,
  transition: 'color 0.3s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  flex: 1, // 【新增】三个按钮平分空间
  // 【新增】手机端响应式
  '@media (max-width: 600px)': {
    fontSize: '0.85rem',
    padding: '8px 12px',
    '& svg': {
      fontSize: '0.9rem',
    }
  }
}));

const ActiveBackground = styled(motion.div)({
  position: 'absolute',
  top: '6px',
  bottom: '6px',
  // 【关键修复】宽度固定为 1/3
  width: 'calc(33.333% - 4px)',
  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  borderRadius: '999px',
  zIndex: 1,
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
});

const MusicModeToggle = ({ mode, onModeChange }) => {
  // 【关键修复】统一使用一套计算逻辑
  const getTranslateX = () => {
    const modeMap = { spotify: 0, local: 1, ytmusic: 2 };
    const index = modeMap[mode] || 0;
    // 每个按钮占 33.333%，加上 padding 补偿
    return `calc(${index * 100}% + ${index * 4}px)`;
  };

  return (
    <ToggleWrapper>
      <ToggleContainer>
        <ActiveBackground
          layout
          initial={false}
          animate={{ x: getTranslateX() }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <ToggleOption isActive={mode === 'spotify'} onClick={() => onModeChange('spotify')}>
          <FaSpotify />
          <span>Spotify</span>
        </ToggleOption>
        <ToggleOption isActive={mode === 'local'} onClick={() => onModeChange('local')}>
          <FaMusic />
          <span>Companion</span>
        </ToggleOption>
        <ToggleOption isActive={mode === 'ytmusic'} onClick={() => onModeChange('ytmusic')}>
          <FaYoutube color="#FF0000" />
          <span>畅听</span>
        </ToggleOption>
      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
