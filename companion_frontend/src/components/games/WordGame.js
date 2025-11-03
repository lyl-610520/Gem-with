// src/components/games/WordGame.js (全新重构版)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Button, CircularProgress, Alert } from '@mui/material';
import { FaPaperPlane, FaRedo } from 'react-icons/fa';
import axios from 'axios';

const WordGame = ({ onClose, onScore }) => {
  const [currentWord, setCurrentWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [playerInput, setPlayerInput] = useState('');
  const [usedWords, setUsedWords] = useState(new Set());
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [isLoading, setIsLoading] = useState(true);
  const [isComputerTurn, setIsComputerTurn] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  const startGame = useCallback(async () => {
    setCurrentWord(''); setTranslation(''); setPlayerInput('');
    setUsedWords(new Set()); setScore(0); setGameEnded(false); setIsLoading(true);
    const randomLetter = 'abcdefg'[Math.floor(Math.random() * 7)];
    await handleComputerTurn(randomLetter, []);
    setIsLoading(false);
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  const handleComputerTurn = async (letter, currentUsedWords) => {
    setIsComputerTurn(true);
    try {
      const response = await axios.post('/games/word/computer-turn', {
        last_letter: letter, used_words: Array.from(currentUsedWords)
      });
      const data = response.data;
      if (data.status === 'success') {
        setCurrentWord(data.word);
        setTranslation(data.translation);
        setUsedWords(prev => new Set(prev).add(data.word));
        setMessage({ text: '轮到你了！', type: 'success' });
      } else {
        setMessage({ text: '恭喜你，电脑被难倒了！', type: 'success' });
        setGameEnded(true);
      }
    } catch (error) {
      setMessage({ text: '电脑开小差了，请重试', type: 'error' });
    } finally {
      setIsComputerTurn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = playerInput.trim().toLowerCase();
    if (!input || isComputerTurn || gameEnded || !currentWord) return;
    if (input[0] !== currentWord.slice(-1)) {
      setMessage({ text: `单词必须以 '${currentWord.slice(-1)}' 开头!`, type: 'error' });
      return;
    }
    if (usedWords.has(input)) {
      setMessage({ text: '这个单词已经用过啦!', type: 'error' }); return;
    }
    setIsLoading(true);
    try {
        const res = await axios.get(`/games/word/lookup/${input}`);
        if(res.data.valid) {
            setScore(prev => prev + input.length);
            const newUsedWords = new Set(usedWords).add(input);
            setUsedWords(newUsedWords);
            setPlayerInput('');
            await handleComputerTurn(input.slice(-1), newUsedWords);
        } else {
            setMessage({ text: '这不是一个有效的英文单词哦!', type: 'error' });
        }
    } catch {
        setMessage({ text: '词典服务暂时不可用', type: 'error' });
    }
    setIsLoading(false);
  };

  const handleEndGame = () => {
    if (score > 0) onScore('word', score);
    onClose();
  };

  return (
    <Paper p={3} sx={{ bgcolor: 'background.paper', borderRadius: 4, width: '100%', maxWidth: 500 }}>
        <Typography variant="h4" align="center" gutterBottom>单词接龙</Typography>
        <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography>分数: {score}</Typography>
            <Typography>回合数: {Math.floor(usedWords.size / 2)}</Typography>
        </Box>
        <Box p={3} mb={2} sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="h3" align="center" color="primary" gutterBottom>{currentWord || '...'}</Typography>
            {translation && <Typography variant="h6" align="center" color="text.secondary">({translation})</Typography>}
        </Box>
        <Box component="form" onSubmit={handleSubmit} display="flex" gap={1} mb={2}>
            <TextField fullWidth autoFocus value={playerInput} onChange={(e) => setPlayerInput(e.target.value)}
                placeholder={isComputerTurn ? '电脑思考中...' : `输入以 '${currentWord ? currentWord.slice(-1) : ''}' 开头的单词`}
                disabled={isComputerTurn || gameEnded || isLoading} />
            <IconButton type="submit" color="primary" disabled={isComputerTurn || gameEnded || !playerInput}>
                <FaPaperPlane />
            </IconButton>
        </Box>
        {message.text && <Alert severity={message.type}>{message.text}</Alert>}
        <Box mt={3} display="flex" justifyContent="space-between">
            <Button variant="outlined" startIcon={<FaRedo />} onClick={startGame}>重新开始</Button>
            <Button variant="contained" onClick={handleEndGame}>结束游戏</Button>
        </Box>
    </Paper>
  );
};

export default WordGame;
