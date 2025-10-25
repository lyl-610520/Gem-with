import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaPaperPlane, FaRedo, FaInfoCircle } from 'react-icons/fa';
import {
  GameContent,
  GameHeader,
  GameTitleModal,
  CloseButton,
  GameArea,
  GameInfo,
  GameButtonGroup,
  Button as BaseButton,
  LoadingSpinner
} from './Games'; // 从 Games.js 导入通用样式组件

// --- 专属于单词游戏的新样式 ---

const WordDisplay = styled.div`
  margin-bottom: 20px;
`;

const CurrentWord = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  letter-spacing: 2px;
  margin-bottom: 10px;
`;

const WordDefinition = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.textLight};
  line-height: 1.6;
  min-height: 50px; /* 防止内容变化时跳动 */
`;

const InputArea = styled.form`
  display: flex;
  gap: 10px;
  margin: 20px 0;
`;

const WordInput = styled.input`
  flex-grow: 1;
  padding: 12px 15px;
  border-radius: 8px;
  border: 2px solid ${props => props.theme.border};
  background: transparent;
  font-size: 1.1rem;
  color: ${props => props.theme.text};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
`;

const SubmitButton = styled.button`
  padding: 0 20px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const MessageDisplay = styled.div`
  min-height: 24px;
  margin-top: 15px;
  font-weight: 500;
  color: ${props => props.error ? '#f44336' : '#4caf50'};
`;

// --- 单词接龙游戏核心组件 ---

const initialWords = ['apple', 'game', 'hello', 'world', 'react', 'space'];

function WordGame({ onClose, onScore }) {
  const [currentWord, setCurrentWord] = useState(null);
  const [definition, setDefinition] = useState('');
  const [playerInput, setPlayerInput] = useState('');
  const [usedWords, setUsedWords] = useState(new Set());
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState({ text: '', error: false });
  const [isLoading, setIsLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);

const fetchWordData = useCallback(async (word) => {
    setIsLoading(true);
    setMessage({ text: '', error: false });
    try {
      // 请求我们自己的后端 API
      const response = await axios.get(`/games/word/lookup/${word}`);
      const data = response.data; // 后端已经处理好了数据格式

      if (data.valid) {
        setCurrentWord(data.word);
        // 使用后端返回的更丰富的释义
        setDefinition(data.meaning || '暂无释义'); 
        setUsedWords(prev => new Set(prev).add(data.word));
        return true;
      } else {
        // 如果后端返回 "valid: false"，我们也可以在这里处理
        return false;
      }
    } catch (error) {
      // axios 对于 404 等状态码会抛出异常，这里统一捕获
      console.error(`Could not find definition for ${word}`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
}, []);

  const startGame = useCallback(() => {
    setGameEnded(false);
    setScore(0);
    setUsedWords(new Set());
    setMessage({ text: '', error: false });
    const randomWord = initialWords[Math.floor(Math.random() * initialWords.length)];
    fetchWordData(randomWord);
  }, [fetchWordData]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = playerInput.trim().toLowerCase();

    if (!input) return;
    if (isLoading) return;

    if (input[0] !== currentWord[currentWord.length - 1]) {
      setMessage({ text: `单词必须以 '${currentWord[currentWord.length - 1]}' 开头!`, error: true });
      return;
    }

    if (usedWords.has(input)) {
      setMessage({ text: '这个单词已经用过啦!', error: true });
      return;
    }
    
    const isValid = await fetchWordData(input);
    if (isValid) {
      const points = input.length;
      setScore(prev => prev + points);
      setMessage({ text: `太棒了! +${points}分`, error: false });
      setPlayerInput('');
    } else {
      setMessage({ text: '无效的单词或未找到该词!', error: true });
    }
  };
  
  const handleEndGame = () => {
    setGameEnded(true);
    if (score > 0) {
      onScore('word', score); // 提交分数
    }
    setMessage({ text: `游戏结束! 你的最终得分是: ${score}`, error: false });
  }

  return (
    <GameContent>
      <GameHeader>
        <GameTitleModal>单词接龙</GameTitleModal>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameHeader>

      <GameInfo>
        <div>分数: {score}</div>
        <div>已用单词: {usedWords.size}</div>
      </GameInfo>

      <GameArea>
        {isLoading && !currentWord ? (
          <LoadingSpinner>正在加载游戏...</LoadingSpinner>
        ) : (
          <>
            <WordDisplay>
              <CurrentWord>{currentWord}</CurrentWord>
              <WordDefinition>
                <FaInfoCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {isLoading ? '正在查询释义...' : definition}
              </WordDefinition>
            </WordDisplay>

            <InputArea onSubmit={handleSubmit}>
              <WordInput
                type="text"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                placeholder={`输入以 '${currentWord ? currentWord[currentWord.length - 1] : ''}' 开头的单词`}
                disabled={isLoading || gameEnded}
                autoFocus
              />
              <SubmitButton type="submit" disabled={isLoading || gameEnded}>
                <FaPaperPlane />
              </SubmitButton>
            </InputArea>
            
            <MessageDisplay error={message.error}>{message.text}</MessageDisplay>
          </>
        )}
      </GameArea>
      
       <GameButtonGroup>
        <BaseButton onClick={startGame} disabled={isLoading}>
          <FaRedo />
          重新开始
        </BaseButton>
        <BaseButton primary onClick={gameEnded ? onClose : handleEndGame}>
          {gameEnded ? '关闭游戏' : '结束并结算'}
        </BaseButton>
      </GameButtonGroup>
    </GameContent>
  );
}

export default WordGame;
