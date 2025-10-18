// src/components/Music.js (绝对正确版 v4)

import React, { useState } from 'react';
import { styled, keyframes } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles'; // <--- 导入 useTheme hook

import MusicModeToggle from './music/MusicModeToggle';
import SpotifyPlayer from './music/SpotifyPlayer';
import LocalPlayer from './music/LocalPlayer';
import { Container } from '@mui/material';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const MusicContainer = styled('div')`
  animation: ${fadeIn} 0.5s ease-out;
`;

// 为了绝对的稳定性，我们创建一个单独的 Title 组件
const StyledTitle = styled('h1')(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: '20px',
  color: theme.palette.text.primary,
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}));

// 使用一个简单的包装组件来确保 theme 总是存在
const Title = () => {
    const theme = useTheme();
    return <StyledTitle theme={theme}>Music Companion</StyledTitle>;
}


function Music({ user }) {
  const [mode, setMode] = useState('spotify'); 

  const pageVariants = {
    initial: { opacity: 0, x: -50, },
    in: { opacity: 1, x: 0, },
    out: { opacity: 0, x: 50, },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
  };

  return (
    // --- VVVV 核心修复 VVVV ---
    // 1. Container 作为最外层的布局容器
    <Container maxWidth="md" sx={{ pt: 2 }}> 
      {/* 2. MusicContainer 在内部，负责自身的动画效果 */}
      <MusicContainer> 
        <Title />

        <MusicModeToggle mode={mode} onModeChange={(newMode) => setMode(newMode)} />

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
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
      </MusicContainer>
    </Container>
    // --- ^^^^ 修复结束 ^^^^ ---
  );
}
export default Music;
