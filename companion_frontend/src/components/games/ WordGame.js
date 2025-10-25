import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { FaPaperPlane, FaRedo } from 'react-icons/fa';
import {
  GameContent, GameHeader, GameTitleModal, CloseButton, GameArea,
  GameInfo, GameButtonGroup, Button as BaseButton, LoadingSpinner
} from './GameUI';
import ErrorBoundary from '../ErrorBoundary';

// --- 样式部分保持不变 ---
const thinkingAnimation = keyframes`0% { content: '电脑正在思考中'; } 25% { content: '电脑正在思考中.'; } 50% { content: '电脑正在思考中..'; } 75% { content: '电脑正在思考中...'; } 100% { content: '电脑正在思考中'; }`;
const WordDisplay = styled.div` margin-bottom: 20px; background: rgba(0,0,0,0.05); padding: 20px; border-radius: 12px; `;
const CurrentWord = styled.h2` font-size: 2.5rem; font-weight: 700; color: ${props => props.theme.primary}; letter-spacing: 2px; margin-bottom: 15px; text-align: center; `;
const WordTranslation = styled.p` font-size: 1.5rem; color: ${props => props.theme.text}; text-align: center; margin-top: -10px; margin-bottom: 20px; `;
const DefinitionContainer = styled.div` font-size: 1rem; color: ${props => props.theme.textLight}; line-height: 1.7; min-height: 60px; border-top: 1px solid ${props => props.theme.border}; padding-top: 10px; margin-top: 10px;`;
const DefinitionZH = styled.p` font-weight: 500; color: ${props => props.theme.text}; margin-bottom: 5px; `;
const InputArea = styled.form` display: flex; gap: 10px; margin: 20px 0; `;
const WordInput = styled.input` flex-grow: 1; padding: 12px 15px; border-radius: 8px; border: 2px solid ${props => props.theme.border}; background: transparent; font-size: 1.1rem; color: ${props => props.theme.text}; transition: all 0.3s ease; &:focus { outline: none; border-color: ${props => props.theme.primary}; } &:disabled { background-color: rgba(0,0,0,0.05); } `;
const SubmitButton = styled.button` padding: 0 20px; border-radius: 8px; border: none; background: ${props => props.theme.primary}; color: white; font-size: 1.2rem; cursor: pointer; transition: all 0.3s ease; &:disabled { background: #ccc; cursor: not-allowed; } `;
const MessageDisplay = styled.div` min-height: 24px; margin-top: 15px; font-weight: 500; color: ${props => props.error ? '#f44336' : (props.isThinking ? props.theme.primary : '#4caf50')}; ${props => props.isThinking && ` &:after { content: '电脑正在思考中'; animation: ${thinkingAnimation} 2s linear infinite; } `} `;

function WordGameComponent({ onClose, onScore }) {
  const [currentWord, setCurrentWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [definition, setDefinition] = useState(null);
  const [playerInput, setPlayerInput] = useState('');
  const [usedWords, setUsedWords] = useState(new Set());
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState({ text: '', error: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isComputerTurn, setIsComputerTurn] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  const stableOnScore = useRef(onScore);
  useEffect(() => { stableOnScore.current = onScore; }, [onScore]);

  // VVVV [核心修正 1/3]: 这是一个纯粹的工具函数，不需要 useCallback VVVV
  const validatePlayerWord = async (word) => {
    try {
      const response = await axios.get(`/games/word/lookup/${word}`);
      return response.data.valid;
    } catch { return false; }
  };

  // VVVV [核心修正 2/3]: 电脑回合逻辑，现在它只负责获取数据和更新状态 VVVV
  const handleComputerTurn = async (letter, currentUsedWords) => {
    setIsComputerTurn(true);
    setMessage({ text: '', error: false });
    try {
      const response = await axios.post('/games/word/computer-turn', {
        last_letter: letter, used_words: currentUsedWords
      });
      const data = response.data;
      if (data && data.status === 'success') {
        setCurrentWord(data.word);
        setTranslation(data.translation);
        setDefinition(data.definition);
        setUsedWords(prev => new Set(prev).add(data.word));
        setMessage({ text: '轮到你了！', error: false });
      } else {
        setMessage({ text: (data && data.message) || '电脑被难倒了！', error: false });
        setGameEnded(true);
      }
    } catch (error) {
      setMessage({ text: '电脑开小差了，请重试', error: true });
    } finally {
      setIsComputerTurn(false);
    }
  };

  // VVVV [核心修正 3/3]: 游戏的“启动”和“重置”逻辑 VVVV
  // 我们把它变成一个普通函数，不再用 useCallback 包裹
  const startGame = async () => {
    // 1. 重置所有状态
    setCurrentWord(''); setTranslation(''); setDefinition(null);
    setPlayerInput(''); setUsedWords(new Set()); setScore(0);
    setGameEnded(false); setIsLoading(true);
    // 2. 电脑开始第一回合
    const initialLetters = 'abcdefg';
    const randomLetter = initialLetters[Math.floor(Math.random() * initialLetters.length)];
    // 3. 直接调用电脑回合，传入一个空的已使用单词列表
    await handleComputerTurn(randomLetter, []);
    setIsLoading(false);
  };
  
  // VVVV [最终解决方案]: 使用这个 useEffect 来确保游戏只在组件第一次加载时启动一次 VVVV
  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <--- 这个空的依赖数组是打破循环的关键！

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = playerInput.trim().toLowerCase();
    if (!input || isComputerTurn || gameEnded || !currentWord) return;
    if (input[0] !== currentWord[currentWord.length - 1]) {
      setMessage({ text: `单词必须以 '${currentWord[currentWord.length - 1]}' 开头!`, error: true });
      return;
    }
    const currentUsedWords = new Set(usedWords);
    if (currentUsedWords.has(input)) {
      setMessage({ text: '这个单词已经用过啦!', error: true }); return;
    }
    setIsLoading(true);
    const isValid = await validatePlayerWord(input);
    if (isValid) {
      setScore(prev => prev + input.length);
      currentUsedWords.add(input);
      setUsedWords(currentUsedWords);
      setPlayerInput('');
      await handleComputerTurn(input[input.length - 1], Array.from(currentUsedWords));
    } else {
      setMessage({ text: '这不是一个有效的英文单词哦!', error: true });
    }
    setIsLoading(false);
  };
  
  const handleEndGame = () => {
    if (!gameEnded) {
      setGameEnded(true);
      if (score > 0) stableOnScore.current('word', score);
      setMessage({ text: `游戏结束! 你的最终得分是: ${score}`, error: false });
    } else {
      onClose();
    }
  }

  return (
    <GameContent>
      <GameHeader>
        <GameTitleModal>单词接龙</GameTitleModal>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameHeader>
      <GameInfo>
        <div>分数: {score}</div>
        <div>回合数: {Math.floor(usedWords.size / 2)}</div>
      </GameInfo>
      <GameArea>
        {isLoading ? <LoadingSpinner>游戏加载中...</LoadingSpinner> : (
          <>
            <WordDisplay>
              <CurrentWord>{currentWord || '...'}</CurrentWord>
              {translation && <WordTranslation>({translation})</WordTranslation>}
              {definition && (
                <DefinitionContainer>
                  {definition.zh && <DefinitionZH>中文释义：{definition.zh}</DefinitionZH>}
                  {definition.en && <p>English: {definition.en}</p>}
                </DefinitionContainer>
              )}
            </WordDisplay>
            <InputArea onSubmit={handleSubmit}>
              <WordInput type="text" value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} placeholder={isComputerTurn ? '' : `输入以 '${currentWord ? currentWord[currentWord.length - 1] : ''}' 开头的单词`} disabled={isComputerTurn || gameEnded} autoFocus />
              <SubmitButton type="submit" disabled={isComputerTurn || gameEnded || !playerInput}><FaPaperPlane /></SubmitButton>
            </InputArea>
            <MessageDisplay error={message.error} isThinking={isComputerTurn}>
              {!isComputerTurn && message.text}
            </MessageDisplay>
          </>
        )}
      </GameArea>
      <GameButtonGroup>
        <BaseButton onClick={startGame}><FaRedo /> 重新开始</BaseButton>
        <BaseButton primary onClick={handleEndGame}>{gameEnded ? '关闭游戏' : '结束游戏'}</BaseButton>
      </GameButtonGroup>
    </GameContent>
  );
}

export default function WordGame(props) {
  return (
    <ErrorBoundary>
      <WordGameComponent {...props} />
    </ErrorBoundary>
  )
}
