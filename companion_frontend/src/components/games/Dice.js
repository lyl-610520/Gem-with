// src/components/games/Dice.js
import React from 'react';
import { motion } from 'framer-motion';
import { FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix } from 'react-icons/fa';

const icons = [FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix];

const Dice = ({ value }) => {
  if (!value) return null;
  const Icon = icons[value - 1];

  return (
    <motion.div
      key={value}
      initial={{ rotateX: -180, scale: 0 }}
      animate={{ rotateX: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      style={{ display: 'inline-block' }}
    >
      <Icon size={56} color="#fff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
    </motion.div>
  );
};

export default Dice;
