// MusicModeToggle.js (最终完美版，修复了图标遮挡问题)
// =======================================================

import React from 'react';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { FaSpotify, FaMusic } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";

// 这些组件保持不变
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

const ActiveBackground = styled(motion.div)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
  borderRadius: '999px',
  zIndex: 1, // 背景在第 1 层
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
});

// 【新增】一个专门用于包裹图标和文字的容器
const ContentWrapper = styled('div')({
  position: 'relative',
  zIndex: 2, // 内容在第 2 层，比背景高！
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
});

// ToggleOption 现在只负责布局和颜色，不再关心内容细节
const ToggleOption = styled('div')(({ isActive }) => ({
  position: 'relative',
  padding: '10px 16px',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: isActive ? '#FFFFFF' : 'rgba(128, 128, 128, 0.9)',
  transition: 'color 0.3s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  '@media (max-width: 600px)': {
    fontSize: '0.85rem',
    padding: '8px 12px',
    '& svg': {
      fontSize: '0.9rem',
    }
  }
}));


const MusicModeToggle = ({ mode, onModeChange }) => {
  return (
    <ToggleWrapper>
      <ToggleContainer>
        
        <ToggleOption isActive={mode === 'spotify'} onClick={() => onModeChange('spotify')}>
          {mode === 'spotify' && <ActiveBackground layoutId="active-pill" />}
          {/* 【修改】用 ContentWrapper 把图标和文字包起来 */}
          <ContentWrapper>
            <FaSpotify />
            <span>Spotify</span>
          </ContentWrapper>
        </ToggleOption>

        <ToggleOption isActive={mode === 'local'} onClick={() => onModeChange('local')}>
          {mode === 'local' && <ActiveBackground layoutId="active-pill" />}
          <ContentWrapper>
            <FaMusic />
            <span>本地</span>
          </ContentWrapper>
        </ToggleOption>
        
        <ToggleOption isActive={mode === 'ytmusic'} onClick={() => onModeChange('ytmusic')}>
          {mode === 'ytmusic' && <ActiveBackground layoutId="active-pill" />}
          <ContentWrapper>
            <FaYoutube color="#FF0000" />
            <span>畅听</span>
          </ContentWrapper>
        </ToggleOption>

      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
