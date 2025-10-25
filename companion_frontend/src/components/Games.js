import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGamepad, FaTrophy, FaPlay, FaPlane } from 'react-icons/fa';
import axios from 'axios';
import ErrorBoundary from './ErrorBoundary';
import MemoryGame from './games/MemoryGame'; // <--- 路径已更新
import WordGame from './games/WordGame';
import LudoGame from './games/LudoGame';

const games = [
  { id: 'memory', title: '记忆翻牌', description: '测试你的记忆力，翻出相同的卡片', icon: <FaGamepad /> },
  { id: 'ludo', title: '飞行棋', description: '起飞，起飞，起飞～', icon: <FaPlane /> },
  { id: 'word', title: '单词接龙', description: '进行一场单词学习游戏', icon: <FaTrophy /> }
];

// --- VVVV 从这里开始，MemoryGame 的函数定义已经全部被删除 VVVV ---

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
