import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGamepad, FaTrophy, FaStar, FaPlay, FaRedo } from 'react-icons/fa';
import axios from 'axios';

const GamesContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 30px;
`;

const GameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const GameCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  }
`;

const GameIcon = styled.div`
  font-size: 3rem;
  color: ${props => props.theme.primary};
  margin-bottom: 15px;
  text-align: center;
`;

const GameTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 10px;
  text-align: center;
`;

const GameDescription = styled.p`
  font-size: 0.95rem;
  color: ${props => props.theme.textLight};
  line-height: 1.5;
  margin-bottom: 15px;
`;

const GameButton = styled.button`
  width: 100%;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  }
`;

const ScoresSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const ScoresTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ScoreItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const ScoreGame = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.text};
  font-weight: 500;
`;

const ScoreValue = styled.div`
  font-size: 1.1rem;
  color: ${props => props.theme.primary};
  font-weight: 600;
`;

const GameModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const GameContent = styled(motion.div)`
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

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const GameTitleModal = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textLight};
  cursor: pointer;
  font-size: 1.5rem;
  
  &:hover {
    color: ${props => props.theme.text};
  }
`;

const GameArea = styled.div`
  text-align: center;
  margin: 30px 0;
`;

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

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: ${props => props.theme.text};
`;

const GameButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: ${props => props.theme.textLight};
`;

const games = [
  {
    id: 'memory',
    title: '记忆翻牌',
    description: '测试你的记忆力，翻出相同的卡片',
    icon: <FaGamepad />
  },
  {
    id: 'puzzle',
    title: '数字拼图',
    description: '移动数字块，按顺序排列',
    icon: <FaStar />
  },
  {
    id: 'word',
    title: '单词接龙',
    description: '与Gemini一起玩单词游戏',
    icon: <FaTrophy />
  }
];

// 记忆翻牌游戏组件
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

function Games({ user }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/games/scores');
      setScores(response.data.scores);
    } catch (error) {
      console.error('获取游戏分数失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = (gameId) => {
    setCurrentGame(gameId);
  };

  const handleGameClose = () => {
    setCurrentGame(null);
  };

  const handleScore = async (gameType, score) => {
    try {
      await axios.post('/games/scores', {
        game_type: gameType,
        score: score,
        level: 1
      });
      await fetchScores();
      alert(`恭喜！你获得了 ${score} 分！`);
    } catch (error) {
      console.error('保存分数失败:', error);
    }
  };

  const getGameTitle = (gameType) => {
    const game = games.find(g => g.id === gameType);
    return game ? game.title : gameType;
  };

  if (loading) {
    return (
      <GamesContainer>
        <LoadingSpinner>正在加载游戏...</LoadingSpinner>
      </GamesContainer>
    );
  }

  return (
    <GamesContainer>
      <Title>🎮 小游戏</Title>

      <GameGrid>
        {games.map((game) => (
          <GameCard
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => handleGameStart(game.id)}
          >
            <GameIcon>{game.icon}</GameIcon>
            <GameTitle>{game.title}</GameTitle>
            <GameDescription>{game.description}</GameDescription>
            <GameButton>
              <FaPlay />
              开始游戏
            </GameButton>
          </GameCard>
        ))}
      </GameGrid>

      <ScoresSection>
        <ScoresTitle>
          <FaTrophy />
          我的成绩
        </ScoresTitle>
        {scores.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
            还没有游戏记录，快来玩一局吧！
          </div>
        ) : (
          scores.map((score) => (
            <ScoreItem key={score.id}>
              <ScoreGame>{getGameTitle(score.game_type)}</ScoreGame>
              <ScoreValue>{score.score} 分</ScoreValue>
            </ScoreItem>
          ))
        )}
      </ScoresSection>

      <AnimatePresence>
        {currentGame === 'memory' && (
          <GameModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MemoryGame onClose={handleGameClose} onScore={handleScore} />
          </GameModal>
        )}
      </AnimatePresence>
    </GamesContainer>
  );
}

export default Games;