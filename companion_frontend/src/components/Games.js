import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGamepad, FaTrophy, FaPlay, FaPlane } from 'react-icons/fa';
import axios from 'axios';
import ErrorBoundary from './ErrorBoundary';

// [修复] 重新导入子游戏组件
import MemoryGame from './games/MemoryGame';
import WordGame from './games/WordGame';
import LudoGame from './games/LudoGame';

// [修复] 将 Games.js 自身需要的样式组件定义加回来
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
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
`;
const LoadingSpinner = styled.div`
  display: flex; justify-content: center; align-items: center; height: 200px; font-size: 1.2rem; color: ${props => props.theme.textLight};
`;

const games = [
  { id: 'memory', title: '记忆翻牌', description: '测试你的记忆力，翻出相同的卡片', icon: <FaGamepad /> },
  { id: 'ludo', title: '飞行棋', description: '起飞，起飞，起飞～', icon: <FaPlane /> },
  { id: 'word', title: '单词接龙', description: '进行一场单词学习游戏', icon: <FaTrophy /> }
];

function Games({ user }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);

  useEffect(() => { fetchScores(); }, []);

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

  const handleGameStart = (gameId) => { setCurrentGame(gameId); };
  const handleGameClose = () => { setCurrentGame(null); };

  const handleScore = async (gameType, score) => {
    try {
      await axios.post('/games/scores', { game_type: gameType, score: score, level: 1 });
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
            <GameButton><FaPlay /> 开始游戏</GameButton>
          </GameCard>
        ))}
      </GameGrid>

      <ScoresSection>
        <ScoresTitle><FaTrophy /> 我的成绩</ScoresTitle>
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

      {/* [修复] 恢复对子游戏组件的渲染 */}
      <AnimatePresence>
        {currentGame === 'memory' && (
          <GameModal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorBoundary><MemoryGame onClose={handleGameClose} onScore={handleScore} /></ErrorBoundary>
          </GameModal>
        )}
        {currentGame === 'word' && (
          <GameModal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorBoundary><WordGame onClose={handleGameClose} onScore={handleScore} /></ErrorBoundary>
          </GameModal>
        )}
        {currentGame === 'ludo' && (
          <GameModal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorBoundary><LudoGame onClose={handleGameClose} onScore={handleScore} /></ErrorBoundary>
          </GameModal>
        )}
      </AnimatePresence>
    </GamesContainer>
  );
}

export default Games;
