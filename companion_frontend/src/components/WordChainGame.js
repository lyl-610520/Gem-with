// src/components/WordChainGame.js (新文件)

import React, a{ useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaBookOpen, FaVolumeUp, FaSyncAlt } from 'react-icons/fa';
import axios from 'axios';

// --- Styled Components (可以复用我上次回复中的大部分样式) ---
// 为了简洁，这里省略了具体的样式代码，你可以直接复制过来
// GameContainer, GameArea, MessageList, LearnCard 等...
// 我会在这里只写一些关键的或修改过的样式
const GameLog = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LogEntry = styled(motion.div)`
  background: ${props => props.theme.primary}15;
  color: ${props => props.theme.text};
  padding: 10px 15px;
  border-radius: 8px;
  border-left: 4px solid ${props => props.theme.primary};
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateX(5px);
    border-left-color: ${props => props.theme.secondary};
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  text-align: center;
  margin: 10px 0;
  height: 20px;
`;

// --- 主组件 ---
function WordChainGame({ onClose, onScore }) {
  const [gameLog, setGameLog] = useState([]); // 游戏记录
  const [inputValue, setInputValue] = useState('');
  const [lastLetter, setLastLetter] = useState('');
  const [score, setScore] = useState(0);
  const [currentWordInfo, setCurrentWordInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const logEndRef = useRef(null);

  // 游戏开始
  useEffect(() => {
    startGame();
  }, []);
  
  // 滚动到底部
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLog]);

  const startGame = () => {
    const startWord = 'start';
    setGameLog([{ word: startWord, info: null }]);
    setLastLetter(startWord.slice(-1));
    setScore(0);
    setInputValue('');
    setError('');
    // 异步获取 "start" 的信息以填充学习卡
    lookupAndDisplay(startWord); 
  };

  const lookupAndDisplay = async (word) => {
    try {
      const res = await axios.get(`/api/games/word/lookup/${word}`);
      if (res.data.valid) {
        setCurrentWordInfo(res.data);
      }
    } catch (err) {
      console.error("Lookup failed:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const word = inputValue.trim().toLowerCase();
    
    if (!word || loading) return;
    setError('');

    // 1. 客户端基本验证
    if (word[0] !== lastLetter) {
      return setError(`单词必须以 '${lastLetter.toUpperCase()}' 开头!`);
    }
    if (gameLog.some(entry => entry.word === word)) {
      return setError('这个单词已经用过了!');
    }
    
    setLoading(true);

    try {
      // 2. 调用后端API验证
      const res = await axios.get(`/api/games/word/lookup/${word}`);
      
      if (res.data.valid) {
        // 验证成功
        const newScore = score + word.length; // 按单词长度计分
        setGameLog(prev => [...prev, { word, info: res.data }]);
        setScore(newScore);
        setLastLetter(word.slice(-1));
        setCurrentWordInfo(res.data);
        setInputValue('');
      }
      
    } catch (err) {
      // 捕获404或其他错误 (单词无效)
      if (err.response && err.response.data && err.response.data.reason) {
        setError(err.response.data.reason);
      } else {
        setError('发生未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndGame = () => {
    if (score > 0) {
      onScore('word', score);
    }
    onClose();
  };
  
  const speakWord = (text) => {
    if ('speechSynthesis' in window && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
       {/* 顶部状态栏: 复用之前的样式即可 */}
       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '15px' }}>
          <div>当前得分: {score}</div>
          <div>目标首字母: <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{lastLetter.toUpperCase()}</span></div>
       </div>

       <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: '450px' }}> {/* GameContainer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}> {/* GameArea */}
             <GameLog>
                {gameLog.map((entry, index) => (
                   <LogEntry 
                      key={index} 
                      onClick={() => entry.info && setCurrentWordInfo(entry.info)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                   >
                     {entry.word}
                   </LogEntry>
                ))}
                <div ref={logEndRef} />
             </GameLog>
             <ErrorMessage>{error}</ErrorMessage>
             <form onSubmit={handleSubmit} style={{ display: 'flex', padding: '15px', borderTop: '1px solid #e5e7eb' }}>
                <input
                   value={inputValue}
                   onChange={e => setInputValue(e.target.value)}
                   placeholder={`输入以 '${lastLetter}' 开头的单词...`}
                   disabled={loading}
                   autoFocus
                   style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                />
                <button type="submit" disabled={loading} style={{ padding: '0 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginLeft: '10px' }}>
                   <FaPaperPlane />
                </button>
             </form>
          </div>

          <AnimatePresence mode="wait">
            {currentWordInfo && (
              <motion.div /* LearnCard */
                 key={currentWordInfo.word}
                 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                 style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}
              >
                  {/* 这里是学习卡片的详细内容，直接复用上次的 JSX 结构 */}
                  <div /* LearnHeader */ style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px' }}>
                     <div>
                        <h2 style={{ fontSize: '2rem', color: '#6366f1', margin: 0 }}>{currentWordInfo.word}</h2>
                        {currentWordInfo.phonetic && (
                           <div onClick={() => speakWord(currentWordInfo.word)} style={{ cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {currentWordInfo.phonetic} <FaVolumeUp size={14}/>
                           </div>
                        )}
                     </div>
                     <FaBookOpen size={24} style={{ opacity: 0.5, color: '#6366f1' }}/>
                  </div>
                  <div /* Meaning */ style={{ fontSize: '1.2rem' }}>{currentWordInfo.meaning}</div>
                  <div /* ExampleSection */ style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px', marginTop: 'auto' }}>
                     <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px' }}>EXAMPLE</div>
                     <div style={{ fontStyle: 'italic' }}>"{currentWordInfo.example}"</div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>
       
       <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
         <button onClick={startGame} style={{ padding: '12px 24px', border: '2px solid #e5e7eb', borderRadius: '8px' }}><FaSyncAlt /> 重新开始</button>
         <button onClick={handleEndGame} style={{ padding: '12px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px' }}>结束游戏</button>
       </div>
    </div>
  );
}

export default WordChainGame;
