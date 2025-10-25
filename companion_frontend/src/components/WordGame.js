import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { FaPaperPlane, FaRedo } from 'react-icons/fa';
import {
  GameContent, GameHeader, GameTitleModal, CloseButton, GameArea,
  GameInfo, GameButtonGroup, Button as BaseButton, LoadingSpinner
} from './Games';
import ErrorBoundary from './ErrorBoundary'; // 强烈建议保留错误捕获器

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
  // VVVV [核心改动 1/4]: 新增 state 用于存储单词的中文翻译 VVVV
  const [translation, setTranslation] = useState('');
  const [definition, setDefinition] = useState(null); // 可以为 null
  const [playerInput, setPlayerInput] = useState('');
  const [usedWords, setUsedWords] = useState(new Set());
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState({ text: '', error: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isComputerTurn, setIsComputerTurn] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  const stableOnScore = useRef(onScore);
  useEffect(() => { stableOnScore.current = onScore; }, [onScore]);

  const validatePlayerWord = async (word) => {
    try {
      const response = await axios.get(`/games/word/lookup/${word}`);
      return response.data.valid;
    } catch { return false; }
  };

  const handleComputerTurn = useCallback(async (letter) => {
    setIsComputerTurn(true);
    setMessage({ text: '', error: false });
    let currentUsedWords = Array.from(usedWords);

    try {
      const response = await axios.post('/games/word/computer-turn', {
        last_letter: letter, used_words: currentUsedWords
      });
      const data = response.data;
      if (data && data.status === 'success') {
        // VVVV [核心改动 2/4]: 更新所有新 state VVVV
        setCurrentWord(data.word);
        setTranslation(data.translation);
        setDefinition(data.definition); // 直接设置，可能为 null
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
  }, [usedWords]); // 依赖 usedWords 是正确的，因为它需要被发送到后端

  const startGame = useCallback(() => {
    setCurrentWord('');
    setTranslation('');
    setDefinition(null);
    setPlayerInput('');
    setUsedWords(new Set());
    setScore(0);
    setGameEnded(false);
    setIsLoading(true);
    const initialLetters = 'abcdefg';
    const randomLetter = initialLetters[Math.floor(Math.random() * initialLetters.length)];
    handleComputerTurn(randomLetter).finally(() => setIsLoading(false));
  }, [handleComputerTurn]);

  useEffect(() => { startGame(); }, [startGame]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = playerInput.trim().toLowerCase();
    if (!input || isComputerTurn || gameEnded || !currentWord) return;
    if (input[0] !== currentWord[currentWord.length - 1]) {
      setMessage({ text: `单词必须以 '${currentWord[currentWord.length - 1]}' 开头!`, error: true }); return;
    }
    if (usedWords.has(input)) {
      setMessage({ text: '这个单词已经用过啦!', error: true }); return;
    }
    setIsLoading(true);
    const isValid = await validatePlayerWord(input);
    if (isValid) {
      setScore(prev => prev + input.length);
      setUsedWords(prev => new Set(prev).add(input));
      setPlayerInput('');
      await handleComputerTurn(input[input.length - 1]);
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
        <GameTitleModal>单词接龙 </GameTitleModal>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameHeader>
      <GameInfo>
        <div>分数: {score}</div>
        <div>回合数: {Math.floor(usedWords.size / 2)}</div>
      </GameInfo>
      <GameArea>
        {isLoading && !currentWord ? <LoadingSpinner>游戏加载中...</LoadingSpinner> : (
          <>
            <WordDisplay>
              <CurrentWord>{currentWord || '...'}</CurrentWord>
              {/* VVVV [核心改动 3/4]: 展示单词的中文翻译 VVVV */}
              {translation && <WordTranslation>({translation})</WordTranslation>}
              
              {/* VVVV [核心改动 4/4]: 安全地渲染可能不存在的定义 VVVV */}
              {definition && (
                <DefinitionContainer>
                  {definition.zh && <DefinitionZH>中文释义：{definition.zh}</DefinitionZH>}
                  {definition.en && <p>English: {definition.en}</p>}
                </DefinitionContainer>
              )}
            </WordDisplay>
            <InputArea onSubmit={handleSubmit}>
              <WordInput type="text" value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} placeholder={isComputerTurn ? '' : `输入以 '${currentWord ? currentWord[currentWord.length - 1] : ''}' 开头的单词`} disabled={isComputerTurn || gameEnded || isLoading} autoFocus />
              <SubmitButton type="submit" disabled={isComputerTurn || gameEnded || isLoading || !playerInput}><FaPaperPlane /></SubmitButton>
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

// 最终导出时，仍然用 ErrorBoundary 包裹，确保万无一失
export default function WordGame(props) {
  return (
    <ErrorBoundary>
      <WordGameComponent {...props} />
    </ErrorBoundary>
  )
}
