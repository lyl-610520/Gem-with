// src/components/games/Piece.js
import React from 'react';
import { motion } from 'framer-motion';

const CELL_SIZE = 40;
const COLORS = {
    red: { piece: '#ff6b7a' },
    green: { piece: '#4ade80' },
    yellow: { piece: '#fbbf24' },
    blue: { piece: '#60a5fa' },
};

// 我们将外包的 Piece 组件适配到我们的系统中
const Piece = ({ playerColor, position, isMovable, onClick }) => {
  return (
    <motion.g
      // 核心动画：当 position 的 x, y 改变时，自动产生弹簧动画
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      style={{ cursor: isMovable ? 'pointer' : 'default', zIndex: isMovable ? 10 : 1 }}
    >
      <motion.circle
        r={CELL_SIZE * 0.4}
        fill={COLORS[playerColor].piece}
        stroke="white"
        strokeWidth="3"
        // 可移动时的放大和发光效果
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        animate={{ 
            scale: isMovable ? [1, 1.15, 1] : 1,
            filter: isMovable ? [
                'drop-shadow(0 0 4px white)',
                'drop-shadow(0 0 12px white)',
                'drop-shadow(0 0 4px white)',
            ] : 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))'
        }}
        transition={isMovable ? { duration: 1.5, repeat: Infinity } : {}}
      />
      {/* 棋子的高光 */}
      <circle r={CELL_SIZE * 0.15} fill="white" cx={-6} cy={-6} opacity={0.7} />
    </motion.g>
  );
};

export default Piece;
