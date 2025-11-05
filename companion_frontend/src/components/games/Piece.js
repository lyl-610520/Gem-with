// src/components/games/Piece.js
import React from 'react';
import { motion } from 'framer-motion';

const Piece = ({ playerColor, position, isMovable, onClick }) => {
  const colors = {
    red: '#ff8a80',
    green: '#b9f6ca',
    yellow: '#ffff8d',
    blue: '#82b1ff',
  };

  return (
    <motion.g // 使用 <g> 元素组合，方便未来扩展
      // 核心动画：当 x, y 改变时，自动产生弹簧动画
      animate={{ x: position.x, y: position.y }}
      initial={false} // 首次渲染时不执行动画
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      style={{ cursor: isMovable ? 'pointer' : 'default' }}
    >
      <motion.circle
        r="16" // 棋子半径
        fill={colors[playerColor]}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="2"
        // 可移动时的放大和发光效果
        whileHover={{ scale: isMovable ? 1.25 : 1.0 }}
        animate={{ scale: isMovable ? [1, 1.1, 1] : 1 }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {/* 棋子的高光，增加立体感 */}
      <circle r="6" fill="rgba(255,255,255,0.5)" cx="-4" cy="-4" />
    </motion.g>
  );
};

export default Piece;
