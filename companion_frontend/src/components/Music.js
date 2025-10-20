// src/components/Music.js (最终美化与适配版)

import React, { useState } from 'react';
import { styled, keyframes } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { Container, Box, Typography } from '@mui/material'; 

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

// 我们保留这个自定义的 Title 组件，因为它效果很棒
const Title = styled('h1')(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: '20px',
  color: theme.palette.text.primary, 
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}));

function Music({ user }) {
  const [mode, setMode] = useState('spotify'); 

  const pageVariants = {
    initial: { opacity: 0, x: -20, },
    in: { opacity: 1, x: 0, },
    out: { opacity: 0, x: 20, },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.4,
  };

  return (
    // --- VVVV 核心布局：套用 Diary.js 的结构 VVVV ---
    <Container maxWidth="md">
      {/* my: 4 代表上下的 margin, 提供了舒适的垂直间距 */}
      <Box sx={{ my: 4 }}> 
        <MusicContainer>
          <Title>Music Companion</Title>

          <MusicModeToggle mode={mode} onModeChange={setMode} />

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
                // VVVV [核心修改] VVVV
                <SpotifyPlayer 
                  user={user} 
                  isSpotifyLinked={user.is_spotify_linked} // 把状态传下去！
                />
                // ^^^^ [核心修改结束] ^^^^
              ) : (
                <LocalPlayer user={user} />
              )}
            </motion.div>
          </AnimatePresence>
        </MusicContainer>
      </Box>
    </Container>
    // --- ^^^^ 布局修改结束 ^^^^ ---
  );
}

export default Music;
