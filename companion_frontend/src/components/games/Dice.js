// src/components/games/Dice.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CELL_SIZE = 40;
const COLORS = { border: '#e2e8f0' };

// 骰子UI组件
const Dice = ({ value, onRoll, disabled }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || 1);

  useEffect(() => {
    if(value !== null) {
        setIsRolling(true);
        // 模拟滚动动画
        const interval = setInterval(() => {
            setDisplayValue(Math.floor(Math.random() * 6) + 1);
        }, 50);

        setTimeout(() => {
            clearInterval(interval);
            setIsRolling(false);
            setDisplayValue(value);
        }, 500);
    }
  }, [value]);


  const dots = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]],
  };

  return (
    <motion.div
        onClick={onRoll}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        whileHover={{scale: disabled ? 1 : 1.1}}
        whileTap={{scale: disabled ? 1 : 0.9}}
    >
      <svg viewBox="0 0 100 100" width={60} height={60}>
        <rect width="100" height="100" rx="15" fill="white" stroke={COLORS.border} strokeWidth={4} />
        {dots[displayValue]?.map((pos, i) => (
          <circle key={i} cx={pos[0]} cy={pos[1]} r={8} fill="#333" />
        ))}
      </svg>
    </motion.div>
  );
};

export default Dice;
