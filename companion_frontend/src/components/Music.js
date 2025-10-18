// src/components/Music.js (全新版本)

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// 导入我们新建的模块化组件
import MusicModeToggle from './music/MusicModeToggle';
import SpotifyPlayer from './music/SpotifyPlayer';
import LocalPlayer from './music/LocalPlayer';
import FloatingChatButton from './music/FloatingChatButton';
// (我们稍后会创建 FloatingChatButton 的内容)

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const MusicContainer = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
  // 使用 Mui 主题的颜色
  color: ${props => props.theme.palette.text.primary}; 
  background: linear-gradient(45deg, ${props => props.theme.palette.primary.main}, ${props => props.theme.palette.secondary.main});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

// 这个组件现在是我们的主战场
function Music({ user }) {
  // 'spotify' 或 'local'
  const [mode, setMode] = useState('spotify'); 
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleOpenChat = () => setIsChatOpen(true);
  const handleCloseChat = () => setIsChatOpen(false);

  const pageVariants = {
    initial: {
      opacity: 0,
      x: -50,
    },
    in: {
      opacity: 1,
      x: 0,
    },
    out: {
      opacity: 0,
      x: 50,
    },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
  };

  return (
    <MusicContainer>
      <Title>Music Companion</Title>

      <MusicModeToggle mode={mode} setMode={setMode} />

      <AnimatePresence mode="wait">
        <motion.div
          key={mode} // 关键！让 AnimatePresence 知道组件已经改变
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
        >
          {mode === 'spotify' ? (
            <SpotifyPlayer user={user} />
          ) : (
            <LocalPlayer user={user} />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* 悬浮聊天助手 (我们稍后实现) */}
      {/* 
      <FloatingChatButton onClick={handleOpenChat} />
      {isChatOpen && <ChatModal onClose={handleCloseChat} />} 
      */}

    </MusicContainer>
  );
}

export default Music;
