// src/components/Games.js (路径修正版)

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, CardActions, Button, 
  Dialog, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { FaGamepad, FaTrophy, FaPlane, FaPlay } from 'react-icons/fa';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// =======================================================
// VVVV                【在这里修正】                    VVVV
// =======================================================
// 修正导入路径，指向 'games' 子文件夹
import MemoryGame from './games/MemoryGame';
import WordGame from './games/WordGame';
import LudoGame from './games/LudoGame';
// =======================================================
// ^^^^                【修正完毕】                      ^^^^
// =======================================================

const games = [
  { id: 'memory', title: '记忆翻牌', description: '测试你的记忆力，翻出相同的卡片', icon: <FaGamepad />, component: MemoryGame },
  { id: 'word', title: '单词接龙', description: '进行一场单词学习游戏', icon: <FaTrophy />, component: WordGame },
  { id: 'ludo', title: '飞行棋', description: '起飞，起飞，起飞～（仅框架）', icon: <FaPlane />, component: LudoGame },
];

function Games({ user, socket }) {
  // ... 函数的其余所有代码都保持不变 ...
  const [scores, setScores] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);

  const fetchScores = async () => {
    try {
      const response = await axios.get('/games/scores');
      setScores(response.data.scores);
    } catch (error) { console.error('获取游戏分数失败:', error); }
  };

  useEffect(() => { fetchScores(); }, []);

  const handleGameStart = (gameId) => setCurrentGame(gameId);
  const handleGameClose = () => setCurrentGame(null);

  const handleScore = async (gameType, score) => {
    await axios.post('/games/scores', { game_type: gameType, score });
    fetchScores();
  };

  const getGameTitle = (gameType) => games.find(g => g.id === gameType)?.title || gameType;
  
  const CurrentGameComponent = games.find(g => g.id === currentGame)?.component;

  return (
    <Box maxWidth="1200px" mx="auto" p={{ xs: 1, sm: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        🎮 游乐中心
      </Typography>

      <Grid container spacing={3} mb={4}>
        {games.map((game) => (
          <Grid item xs={12} md={4} key={game.id}>
            <Card elevation={2} sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                <Box color="primary.main" fontSize={50} mb={2}>{game.icon}</Box>
                <Typography variant="h5" fontWeight={600}>{game.title}</Typography>
                <Typography color="text.secondary">{game.description}</Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                <Button 
                  variant="contained" 
                  startIcon={<FaPlay />} 
                  onClick={() => handleGameStart(game.id)}
                  disabled={game.disabled}
                >
                  开始游戏
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>🏆 排行榜</Typography>
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>游戏</TableCell>
              <TableCell align="right">分数</TableCell>
              <TableCell align="right">时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((score) => (
              <TableRow key={score.id}>
                <TableCell component="th" scope="row">{getGameTitle(score.game_type)}</TableCell>
                <TableCell align="right">{score.score}</TableCell>
                <TableCell align="right">{new Date(score.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        fullScreen 
        open={!!currentGame} 
        onClose={handleGameClose}
        PaperProps={{
          style: { 
            backgroundColor: '#f5f7fa', // 给游戏背景一个护眼的淡灰色
            backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' // 或者微渐变
          }
        }}
      >
        <AnimatePresence>
          {CurrentGameComponent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ height: '100vh', display: 'flex', flexDirection: 'column' }} // 让 motion.div 占满全屏并垂直排列
            >
              {/* 1. 顶部导航栏：给一个明确的关闭按钮区域 */}
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                zIndex: 10
              }}>
                 <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
                    {getGameTitle(currentGame)}
                 </Typography>
                 <Button variant="outlined" color="error" onClick={handleGameClose}>
                    退出游戏
                 </Button>
              </Box>

              {/* 2. 游戏舞台容器：解决所有布局问题 */}
              <Box sx={{ 
                flex: 1,                // 占据剩余高度
                width: '100%',
                overflowY: 'auto',      // 【关键】垂直滚动（解决飞行棋截断）
                overflowX: 'hidden',    // 禁止横向溢出
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',   // 【关键】水平居中（解决iPad左上角问题）
                justifyContent: 'flex-start', // 内容从顶部开始，不够高时也不会强制拉伸
                pt: 4,                  // 顶部留白
                pb: 10,                 // 底部留白（防止被手机小黑条遮挡）
                px: 2                   // 左右留白
              }}>
                {/* 3. 游戏内容限制器：防止游戏在宽屏上变得无限宽 */}
                <Box sx={{
                  width: '100%',
                  maxWidth: '800px', // 限制最大宽度，让游戏界面更紧凑
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <CurrentGameComponent 
                    onClose={handleGameClose} 
                    onScore={handleScore} 
                    user={user} 
                    socket={socket}
                  />
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>
    </Box>
  );
};

export default Games;
