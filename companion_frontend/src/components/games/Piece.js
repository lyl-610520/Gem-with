// src/components/games/Piece.js
import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

const GRADIENT = {
  red:    'linear-gradient(135deg, #ef5350, #d32f2f)',
  green:  'linear-gradient(135deg, #66bb6a, #388e3c)',
  yellow: 'linear-gradient(135deg, #ffca28, #f9a825)',
  blue:   'linear-gradient(135deg, #42a5f5, #1976d2)',
};

const Piece = ({ playerColor, gridPos, isMovable, onClick }) => {
  return (
    <Box
      sx={{
        gridRow: gridPos.r,
        gridColumn: gridPos.c,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      <motion.div
        layoutId={`piece-${playerColor}`}   // 同一颜色棋子共享 id，实现平滑移动
        onClick={onClick}
        whileHover={isMovable ? { scale: 1.3 } : {}}
        animate={isMovable ? { boxShadow: '0 0 20px rgba(255,255,255,0.8)' } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          width: '68%',
          height: '68%',
          borderRadius: '50%',
          background: GRADIENT[playerColor],
          cursor: isMovable ? 'pointer' : 'default',
          border: '3px solid #fff',
          boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
        }}
      />
    </Box>
  );
};

export default Piece;
