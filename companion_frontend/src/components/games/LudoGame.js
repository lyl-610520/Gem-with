// src/components/games/LudoGame.js (全新重构版，占位符)
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { FaPlane } from 'react-icons/fa';

const LudoGame = ({ onClose }) => {
  return (
    <Box p={3} sx={{ bgcolor: 'background.paper', borderRadius: 4, textAlign: 'center' }}>
      <FaPlane size={50} color="primary" />
      <Typography variant="h4" gutterBottom mt={2}>飞行棋</Typography>
      <Typography color="text.secondary" mb={3}>
        这个游戏正在紧张开发中，敬请期待！
      </Typography>
      <Button variant="contained" onClick={onClose}>返回大厅</Button>
    </Box>
  );
};

export default LudoGame;
