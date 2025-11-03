// src/components/games/MemoryGame.js (全新重构版)
import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { FaRedo } from 'react-icons/fa';

const symbols = ['🌟', '🎵', '📚', '🎮', '💖', '🎨', '🌈', '⭐'];

const MemoryGame = ({ onClose, onScore }) => {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const resetGame = () => {
    const gameCards = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({ id: index, symbol }));
    setCards(gameCards);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setGameOver(false);
  };

  useEffect(resetGame, []);

  const handleCardClick = (cardId) => {
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
          setGameOver(true);
        }
      } else {
        setTimeout(() => setFlippedCards([]), 1000);
      }
    }
  };
  
  const handleEndGame = () => {
      const score = Math.max(0, 1000 - moves * 20);
      onScore('memory', score);
      onClose();
  }

  return (
    <Box p={3} sx={{ bgcolor: 'background.paper', borderRadius: 4, width: '100%', maxWidth: 500 }}>
        <Typography variant="h4" align="center" gutterBottom>记忆翻牌</Typography>
        <Typography align="center" color="text.secondary" mb={3}>步数: {moves}</Typography>
        <Grid container spacing={2}>
            {cards.map(card => (
                <Grid item xs={3} key={card.id}>
                    <Card
                        onClick={() => handleCardClick(card.id)}
                        sx={{
                            aspectRatio: '1 / 1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            cursor: 'pointer',
                            transform: flippedCards.includes(card.id) || matchedCards.includes(card.id) ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transition: 'transform 0.5s',
                            bgcolor: flippedCards.includes(card.id) || matchedCards.includes(card.id) ? 'primary.light' : 'grey.300',
                        }}
                    >
                        <Box sx={{ transform: 'rotateY(180deg)' }}>
                            {flippedCards.includes(card.id) || matchedCards.includes(card.id) ? card.symbol : ''}
                        </Box>
                    </Card>
                </Grid>
            ))}
        </Grid>
        <Box mt={3} display="flex" justifyContent="space-between">
            <Button variant="outlined" startIcon={<FaRedo />} onClick={resetGame}>重新开始</Button>
            <Button variant="contained" onClick={onClose}>退出游戏</Button>
        </Box>
        <Dialog open={gameOver} onClose={handleEndGame}>
            <DialogTitle>🎉 恭喜你，游戏完成！ 🎉</DialogTitle>
            <DialogContent>
                <Typography>你用了 {moves} 步完成了游戏！</Typography>
                <Typography variant="h5" align="center" mt={2}>得分: {Math.max(0, 1000 - moves * 20)}</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={resetGame}>再玩一局</Button>
                <Button onClick={handleEndGame} autoFocus>查看分数</Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
};

export default MemoryGame;
