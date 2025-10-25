import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaRedo } from 'react-icons/fa';

// VVVV [核心改动]: 从上一级目录导入所有共享的样式组件 VVVV
import {
  GameContent,
  GameHeader,
  GameTitleModal,
  CloseButton,
  GameArea,
  GameInfo,
  GameButtonGroup,
  Button
} from '../Games';

// --- 专属于记忆翻牌的样式 ---
const MemoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-width: 400px;
  margin: 0 auto;
`;

const MemoryCard = styled(motion.div)`
  aspect-ratio: 1;
  background: ${props => props.flipped ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.5rem;
  color: white;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

// --- 记忆翻牌游戏组件 (现在是独立组件) ---
function MemoryGame({ onClose, onScore }) {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const symbols = ['🌟', '🎵', '📚', '🎮', '💖', '🎨', '🌈', '⭐'];

  useEffect(() => {
    // 初始化游戏
    const gameCards = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({ id: index, symbol, flipped: false }));
    
    setCards(gameCards);
  }, []);

  useEffect(() => {
    let interval;
    if (gameStarted) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted]);

  const handleCardClick = (cardId) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    if (flippedCards.length >= 2 || flippedCards.includes(cardId) || matchedCards.includes(cardId)) {
      return;
    }

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      
      const [firstCard, secondCard] = newFlippedCards;
      const firstSymbol = cards.find(c => c.id === firstCard)?.symbol;
      const secondSymbol = cards.find(c => c.id === secondCard)?.symbol;

      if (firstSymbol === secondSymbol) {
        setMatchedCards(prev => [...prev, firstCard, secondCard]);
        setFlippedCards([]);
        
        if (matchedCards.length + 2 === cards.length) {
          // 游戏结束
          const score = Math.max(0, 1000 - moves * 10 - time * 5);
          onScore('memory', score);
        }
      } else {
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const resetGame = () => {
    const gameCards = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({ id: index, symbol, flipped: false }));
    
    setCards(gameCards);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setTime(0);
    setGameStarted(false);
  };

  return (
    <GameContent>
      <GameHeader>
        <GameTitleModal>记忆翻牌</GameTitleModal>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameHeader>

      <GameInfo>
        <div>步数: {moves}</div>
        <div>时间: {time}秒</div>
        <div>匹配: {matchedCards.length / 2}/8</div>
      </GameInfo>

      <GameArea>
        <MemoryGrid>
          {cards.map((card) => (
            <MemoryCard
              key={card.id}
              flipped={flippedCards.includes(card.id) || matchedCards.includes(card.id)}
              onClick={() => handleCardClick(card.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {(flippedCards.includes(card.id) || matchedCards.includes(card.id)) && card.symbol}
            </MemoryCard>
          ))}
        </MemoryGrid>
      </GameArea>

      <GameButtonGroup>
        <Button onClick={resetGame}>
          <FaRedo />
          重新开始
        </Button>
        <Button primary onClick={onClose}>
          关闭游戏
        </Button>
      </GameButtonGroup>
    </GameContent>
  );
}

export default MemoryGame;
