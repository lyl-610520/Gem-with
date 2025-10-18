// src/components/Music.js (最终布局版 v5)

import React, { useState } from 'react';
import { styled, keyframes } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { Container, Box, Typography } from '@mui/material'; // <--- 引入布局组件

import MusicModeToggle from './music/MusicModeToggle';
import SpotifyPlayer from './music/SpotifyPlayer';
import LocalPlayer from './music/LocalPlayer';

const MusicContent = styled('div')``; // 重命名，避免与 Container 混淆

function Music({ user }) {
  const [mode, setMode] = useState('spotify'); 

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    in: { opacity: 1, scale: 1, y: 0 },
    out: { opacity: 0, scale: 0.98, y: -10 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'circOut', // 使用更平滑的动画曲线
    duration: 0.4,
  };

  return (
    // --- VVVV 核心布局修复 VVVV ---
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}> {/* <-- 使用 Box 控制垂直边距 */}
        <MusicContent>
            
          {/* 使用 Typography 实现与 Diary.js 一致的标题风格 */}
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight="bold" 
            align="center"
            sx={{ 
                mb: 3, 
                background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
            }}
          >
            🎵 音乐空间
          </Typography>

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
                <SpotifyPlayer user={user} />
              ) : (
                <LocalPlayer user={user} />
              )}
            </motion.div>
          </AnimatePresence>
        </MusicContent>
      </Box>
    </Container>
    // --- ^^^^ 核心布局修复结束 ^^^^ ---
  );
}

export default Music;
