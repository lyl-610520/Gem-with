// src/components/music/MusicModeToggle.js (已修复版本)

import React from 'react';
// --- VVVV 核心修改 VVVV ---
import { styled } from '@mui/system'; // 从 @mui/system 导入 styled
import { motion } from 'framer-motion';
import { FaSpotify } from "react-icons/fa";
import { FaMusic } from "react-icons/fa6";
// --- ^^^^ 修改结束 ^^^^ ---

const ToggleWrapper = styled('div')`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
`;

const ToggleContainer = styled('div')`
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px;
  background-color: rgba(128, 128, 128, 0.15);
  border-radius: 999px;
  cursor: pointer;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
`;

const ToggleOption = styled('div')(({ isActive }) => ({
  position: 'relative',
  padding: '10px 25px',
  fontSize: '1rem',
  fontWeight: 600,
  // --- VVVV 核心修改 VVVV ---
  // 不再依赖 props.theme，而是直接使用颜色值或 CSS 变量
  // 并且，未激活状态的颜色应该更柔和，以适应深色模式
  color: isActive ? '#FFFFFF' : 'rgba(128, 128, 128, 0.9)', 
  // --- ^^^^ 修改结束 ^^^^ ---
  zIndex: 2,
  transition: 'color 0.3s ease-in-out',
  display: 'flex',
  align-items: 'center',
  gap: '8px',
}));

const ActiveBackground = styled(motion.div)`
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: calc(50% - 6px); // 稍微调整宽度计算以获得更好效果
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 999px;
  z-index: 1;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.4);
`;

const MusicModeToggle = ({ mode, setMode }) => {
  return (
    <ToggleWrapper>
      <ToggleContainer>
        <ActiveBackground
          layout
          initial={false}
          animate={{ x: mode === 'spotify' ? 0 : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <ToggleOption isActive={mode === 'spotify'} onClick={() => setMode('spotify')}>
          <FaSpotify />
          Spotify Link
        </ToggleOption>
        <ToggleOption isActive={mode === 'local'} onClick={() => setMode('local')}>
          <FaMusic />
          Companion Player
        </ToggleOption>
      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
