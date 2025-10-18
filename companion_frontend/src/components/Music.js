// src/components/Music.js (全新版本)

import React, { useState } from 'react';
// --- VVVV 核心修改 VVVV ---
import { styled, keyframes } from '@mui/system'; // 从 @mui/system 导入 styled 和 keyframes
import { motion, AnimatePresence } from 'framer-motion';
// --- ^^^^ 修改结束 ^^^^ ---

import MusicModeToggle from './music/MusicModeToggle';
import SpotifyPlayer from './music/SpotifyPlayer';
import LocalPlayer from './music/LocalPlayer';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const MusicContainer = styled('div')`
  animation: ${fadeIn} 0.5s ease-out;
`;

// --- VVVV 核心修改 VVVV ---
// 我们将 styled() 的参数从 'h1' 字符串改为了一个函数，
// 这样它就能接收到 theme 对象了
const Title = styled('h1')(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: '20px',
  // 现在可以安全地访问 theme 对象了！
  color: theme.palette.text.primary, 
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}));
// --- ^^^^ 修改结束 ^^^^ ---


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
