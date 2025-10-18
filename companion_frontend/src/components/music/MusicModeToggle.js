// src/components/music/MusicModeToggle.js

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpotify } from "react-icons/fa";
import { FaMusic } from "react-icons/fa6";

const ToggleWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
`;

const ToggleContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px;
  background-color: rgba(128, 128, 128, 0.15);
  border-radius: 999px;
  cursor: pointer;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
`;

const ToggleOption = styled.div`
  position: relative;
  padding: 10px 25px;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.isActive ? '#FFFFFF' : 'rgba(0, 0, 0, 0.6)'};
  z-index: 2;
  transition: color 0.3s ease-in-out;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActiveBackground = styled(motion.div)`
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: 50%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 999px;
  z-index: 1;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.4);
`;

const MusicModeToggle = ({ mode, setMode }) => {
  return (
    <ToggleWrapper>
      <ToggleContainer>
        <ActiveBackground
          layout
          initial={false}
          animate={{ x: mode === 'spotify' ? 0 : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <ToggleOption isActive={mode === 'spotify'} onClick={() => setMode('spotify')}>
          <FaSpotify />
          Spotify Link
        </ToggleOption>
        <ToggleOption isActive={mode === 'local'} onClick={() => setMode('local')}>
          <FaMusic />
          Companion Player
        </ToggleOption>
      </ToggleContainer>
    </ToggleWrapper>
  );
};

export default MusicModeToggle;
