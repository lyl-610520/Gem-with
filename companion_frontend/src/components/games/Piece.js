import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

const Piece = ({ playerColor, gridPos, isMovable, onClick }) => {
  const colorMap = {
    red: '#d32f2f',
    green: '#388e3c',
    yellow: '#fbc02d',
    blue: '#1976d2',
  };

  return (
    <Box
      sx={{
        gridRow: gridPos.r,
        gridColumn: gridPos.c,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
      }}
    >
      <motion.div
        whileHover={{ scale: isMovable ? 1.2 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        onClick={onClick}
        style={{
          width: '70%',
          height: '70%',
          borderRadius: '50%',
          backgroundColor: colorMap[playerColor],
          cursor: isMovable ? 'pointer' : 'default',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          filter: isMovable ? 'brightness(1.2)' : 'brightness(1)',
          animation: isMovable ? 'glow 1.5s infinite alternate' : 'none',
          '@keyframes glow': {
            'from': { boxShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #007bff' },
            'to': { boxShadow: '0 0 10px #fff, 0 0 20px #007bff, 0 0 30px #007bff' }
          }
        }}
      />
    </Box>
  );
};

export default Piece;
