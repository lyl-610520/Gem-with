// 3. Music.js - 修复手机端适配
// ========================================

import React, { useState } from 'react';
import { styled, keyframes } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { Container, Box, Typography } from '@mui/material'; 

import MusicModeToggle from './music/MusicModeToggle';
import SpotifyPlayer from './music/SpotifyPlayer';
import LocalPlayer from './music/LocalPlayer';
import YTMusicPlayer from './music/YTMusicPlayer';
import FloatingChatButton from './music/FloatingChatButton';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const MusicContainer = styled('div')`
  animation: ${fadeIn} 0.5s ease-out;
`;

const Title = styled('h1')(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: '20px',
  color: theme.palette.text.primary, 
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  // 【新增】手机端响应式
  '@media (max-width: 600px)': {
    fontSize: '1.75rem',
    marginBottom: '16px',
  }
}));

function Music({ user }) {
  const [mode, setMode] = useState('ytmusic'); 

  const pageVariants = {
    initial: { opacity: 0, x: -20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: 20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.4,
  };

  return (
    // 【关键修复】添加手机端 padding
    <Container 
      maxWidth="md"
      sx={{
        px: { xs: 2, sm: 3 }, // 手机端左右 padding 16px, 平板及以上 24px
      }}
    >
      <Box sx={{ 
        my: { xs: 2, sm: 4 } // 手机端上下 margin 更小
      }}> 
        <MusicContainer>
          <Title>Music Companion</Title>

          <MusicModeToggle mode={mode} onModeChange={setMode} />

          {/* 保持一个稳定的容器，不再有 key */}
          <Box sx={{ position: 'relative' /* AnimatePresence 需要一个定位的父级来处理 absolute 的子元素 */ }}>
            <AnimatePresence mode="wait">
              {mode === 'spotify' && (
                <motion.div
                  key="spotify" // 每个子元素自己有固定的 key
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <SpotifyPlayer user={user} isSpotifyLinked={user.is_spotify_linked} />
                </motion.div>
              )}

              {mode === 'local' && (
                <motion.div
                  key="local"
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <LocalPlayer user={user} />
                </motion.div>
              )}

              {mode === 'ytmusic' && (
                <motion.div
                  key="ytmusic"
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <YTMusicPlayer user={user} />
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </MusicContainer>
        <FloatingChatButton user={user} />
      </Box>
    </Container>
  );
}

export default Music;
