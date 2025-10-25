import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
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
  Button as BaseButton
} from './Games'; // 确保从 Games.js 导出了这些

// --- 动画和新样式 ---
const thinkingAnimation = keyframes`
  0% { content: '正在思考中'; }
  25% { content: '正在思考中.'; }
  50% { content: '正在思考中..'; }
  75% { content: '正在思考中...'; }
  100% { content: '正在思考中'; }
`;

const WordDisplay = styled.div`
  margin-bottom: 20px;
  background: rgba(0,0,0,0.05);
  padding: 20px;
  border-radius: 12px;
`;

const CurrentWord = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.primary};
  letter-spacing: 2px;
  margin-bottom: 15px;
  text-align: center;
`;

const DefinitionContainer = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.textLight};
  line-height: 1.7;
  min-height: 60px;
`;

const DefinitionZH = styled.p`
  font-weight: 500;
  color: ${props => props.theme.text};
  margin-bottom: 5px;
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
  }

  &:disabled {
    background-color: rgba(0,0,0,0.05);
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
  transition: all 0.3s ease;
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const MessageDisplay = styled.div`
  min-height: 24px;
  margin-top: 15px;
  font-weight: 500;
  color: ${props => props.error ? '#f44336' : (props.isThinking ? props.theme.primary : '#4caf50')};

  ${props => props.isThinking && `
    &:after {
      content: '正在思考中';
      animation: ${thinkingAnimation} 2s linear infinite;
    }
  `}
`;

// --- 单词接龙游戏核心组件 (人机对战版) ---

const initialWords = ['apple', 'game', 'hello', 'world', 'react', 'space'];

function WordGame({ onClose, onScore }) {
  const [currentWord, setCurrentWord] = useState('');
  const [definition, setDefinition] = useState({ en: '', zh: '' });
  const [playerInput, setPlayerInput] = useState('');
  const [usedWords, setUsedWords] = useState(new Set());
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState({ text: '', error: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isComputerTurn, setIsComputerTurn] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  // 验证玩家输入的单词
  const validatePlayerWord = async (word) => {
    try {
      const response = await axios.get(`/games/word/lookup/${word}`);
      return response.data.valid;
    } catch (error) {
      return false;
    }
  };

  const startGame = useCallback(() => {
    setIsLoading(true);
    const randomWord = initialWords[Math.floor(Math.random() * initialWords.length)];
    // 在游戏开始时，让电脑先出一个词
    handleComputerTurn(randomWord[randomWord.length - 1]);
    
    // 重置状态
    setGameEnded(false);
    setScore(0);
    setUsedWords(new Set([randomWord])); // 把起始词加入已使用列表
    setMessage({ text: '游戏开始，请接龙！', error: false });
    setIsLoading(false);
  }, []); // Eslint might complain, but we want this to run once.

  useEffect(() => {
    startGame();
  }, [startGame]);


  const handleComputerTurn = async (letter) => {
      setIsComputerTurn(true);
      try {
        const response = await axios.post('/games/word/computer-turn', {
          last_letter: letter,
          used_words: Array.from(usedWords)
        });

        const data = response.data;
        if (data.status === 'success') {
          setCurrentWord(data.word);
          setDefinition(data.definition);
          setUsedWords(prev => new Set(prev).add(data.word));
          setMessage({text: '轮到你了！', error: false});
        } else {
          // 电脑找不到词，玩家胜利
          setMessage({ text: data.message, error: false });
          handleEndGame();
        }
      } catch (error) {
        setMessage({ text: '电脑开小差了，请重试', error: true });
      } finally {
        setIsComputerTurn(false);
      }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = playerInput.trim().toLowerCase();

    if (!input || isComputerTurn || gameEnded) return;

    // 1. 基本规则检查
    if (input[0] !== currentWord[currentWord.length - 1]) {
      setMessage({ text: `单词必须以 '${currentWord[currentWord.length - 1]}' 开头!`, error: true });
      return;
    }
    if (usedWords.has(input)) {
      setMessage({ text: '这个单词已经用过啦!', error: true });
      return;
    }

    // 2. 验证单词有效性
    setIsLoading(true);
    const isValid = await validatePlayerWord(input);
    setIsLoading(false);

    if (isValid) {
      const points = input.length;
      setScore(prev => prev + points);
      setMessage({ text: `很棒! +${points}分`, error: false });
      setPlayerInput('');
      
      // 3. 将玩家单词加入列表，然后触发电脑回合
      setUsedWords(prev => new Set(prev).add(input));
      handleComputerTurn(input[input.length - 1]);
    } else {
      setMessage({ text: '这不是一个有效的英文单词哦!', error: true });
    }
  };
  
  const handleEndGame = () => {
    setGameEnded(true);
    if (score > 0) {
      onScore('word', score);
    }
    setMessage({ text: `游戏结束! 你的最终得分是: ${score}`, error: false });
  }

  return (
    <GameContent>
      <GameHeader>
        <GameTitleModal>单词接龙 </GameTitleModal>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameHeader>

      <GameInfo>
        <div>分数: {score}</div>
        <div>回合数: {Math.floor(usedWords.size / 2)}</div>
      </GameInfo>

      <GameArea>
          <WordDisplay>
            <CurrentWord>{currentWord || '...'}</CurrentWord>
            <DefinitionContainer>
              {definition.zh && <DefinitionZH>中文释义：{definition.zh}</DefinitionZH>}
              {definition.en && <p>English: {definition.en}</p>}
            </DefinitionContainer>
          </WordDisplay>

          <InputArea onSubmit={handleSubmit}>
            <WordInput
              type="text"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder={isComputerTurn ? '' : `输入以 '${currentWord ? currentWord[currentWord.length - 1] : ''}' 开头的单词`}
              disabled={isComputerTurn || gameEnded || isLoading}
              autoFocus
            />
            <SubmitButton type="submit" disabled={isComputerTurn || gameEnded || isLoading}>
              <FaPaperPlane />
            </SubmitButton>
          </InputArea>
          
          <MessageDisplay 
            error={message.error} 
            isThinking={isComputerTurn}
          >
             {!isComputerTurn && message.text}
          </MessageDisplay>
      </GameArea>
      
       <GameButtonGroup>
        <BaseButton onClick={startGame}>
          <FaRedo />
          重新开始
        </BaseButton>
        <BaseButton primary onClick={gameEnded ? onClose : handleEndGame}>
          {gameEnded ? '关闭游戏' : '结束游戏'}
        </BaseButton>
      </GameButtonGroup>
    </GameContent>
  );
}

export default WordGame;
