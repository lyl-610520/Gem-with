import React from 'react';
import { Box } from '@mui/material';
import { FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix } from 'react-icons/fa';
import { motion } from 'framer-motion';

const diceIcons = [FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix];

const Dice = ({ value }) => {
  if (!value) return null;
  const Icon = diceIcons[value - 1];

  return (
    <motion.div
      key={value + Date.now()} // Force re-render for animation
      initial={{ scale: 0.5, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Icon size={50} color="primary" />
    </motion.div>
  );
};

export default Dice;
