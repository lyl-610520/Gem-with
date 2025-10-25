// src/components/games/GameUI.js

import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// --- VVVV 所有游戏共享的UI组件 VVVV ---

// 游戏模态框和基础布局
export const GameContent = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 30px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

export const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const GameTitleModal = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textLight};
  cursor: pointer;
  font-size: 1.5rem;
  &:hover {
    color: ${props => props.theme.text};
  }
`;

export const GameArea = styled.div`
  text-align: center;
  margin: 30px 0;
`;

export const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: ${props => props.theme.text};
`;

export const GameButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
`;

// 通用按钮
export const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${props => props.primary ? `
    background: ${props.theme.primary};
    color: white;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
    }
  ` : `
    background: transparent;
    color: ${props.theme.textLight};
    border: 2px solid ${props.theme.border};
    &:hover {
      border-color: ${props.theme.primary};
      color: ${props.theme.primary};
    }
  `}
`;

// 加载动画
export const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: ${props => props.theme.textLight};
`;

// 分数展示区
export const ScoresSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

export const ScoresTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const ScoreItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.border};
  &:last-child {
    border-bottom: none;
  }
`;

export const ScoreGame = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.text};
  font-weight: 500;
`;

export const ScoreValue = styled.div`
  font-size: 1.1rem;
  color: ${props => props.theme.primary};
  font-weight: 600;
`;
