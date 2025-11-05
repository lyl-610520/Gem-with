// src/components/games/LudoBoard.js
import React from 'react';
import { Box, Paper, Typography, Button, Chip, Grid, Dialog, DialogTitle, DialogContent, Avatar } from '@mui/material';
import { FaUser, FaCrown, FaDice, FaRobot } from 'react-icons/fa';
import useLudoStore from '../../stores/ludoStore';
import { getPiecePosition } from './ludoBoardUtils';
import Piece from './Piece';
import Dice from './Dice';
import { motion } from 'framer-motion';

// 新增：棋盘背景组件
const BoardBackground = () => {
    // 按照图纸绘制背景色块和格子
    const TILE_SIZE = 40;
    const colors = { red: '#fde4e1', green: '#dff7e2', yellow: '#fffac9', blue: '#e0ecfb', path: '#f4e9ff'};
    
    // 生成所有路径格子
    const pathTiles = [];
    const pathLayout = [
        ...Array(5).fill(0).map((_,i) => ({x:i, y:6, c:colors.path})), {x:5,y:6,c:colors.red}, // 横
        ...Array(5).fill(0).map((_,i) => ({x:6, y:i, c:colors.path})), {x:6,y:5,c:colors.green}, // 竖
        ...Array(2).fill(0).map((_,i) => ({x:7+i, y:0, c:colors.path})), // 上
        ...Array(5).fill(0).map((_,i) => ({x:8, y:i, c:colors.path})), {x:8,y:5,c:colors.green}, // 竖
        {x:9,y:6,c:colors.green}, ...Array(5).fill(0).map((_,i) => ({x:10+i, y:6, c:colors.path})), // 横
        ...Array(2).fill(0).map((_,i) => ({x:14, y:7+i, c:colors.path})), // 右
        {x:9,y:8,c:colors.yellow}, ...Array(5).fill(0).map((_,i) => ({x:10+i, y:8, c:colors.path})), // 横
        ...Array(5).fill(0).map((_,i) => ({x:8, y:10+i, c:colors.path})), {x:8,y:9,c:colors.blue}, // 竖
        ...Array(2).fill(0).map((_,i) => ({x:7-i, y:14, c:colors.path})), // 下
        ...Array(5).fill(0).map((_,i) => ({x:6, y:10+i, c:colors.path})), {x:6,y:9,c:colors.blue}, // 竖
        {x:5,y:8,c:colors.red}, ...Array(5).fill(0).map((_,i) => ({x:i, y:8, c:colors.path})), // 横
        ...Array(2).fill(0).map((_,i) => ({x:0, y:7-i, c:colors.path})), // 左
    ];
    pathTiles.push(...pathLayout.map((p, i) => <rect key={`p${i}`} x={p.x*TILE_SIZE+20} y={p.y*TILE_SIZE+20} width={TILE_SIZE} height={TILE_SIZE} rx="8" fill={p.c} />));
    
    // 安全回家路径
    const homeTiles = [];
    homeTiles.push(...Array(6).fill(0).map((_,i) => <rect key={`hr${i}`} x={(1+i)*TILE_SIZE+20} y={7*TILE_SIZE+20} width={TILE_SIZE} height={TILE_SIZE} rx="8" fill={colors.red} />));
    homeTiles.push(...Array(6).fill(0).map((_,i) => <rect key={`hg${i}`} x={7*TILE_SIZE+20} y={(1+i)*TILE_SIZE+20} width={TILE_SIZE} height={TILE_SIZE} rx="8" fill={colors.green} />));
    homeTiles.push(...Array(6).fill(0).map((_,i) => <rect key={`hy${i}`} x={(13-i)*TILE_SIZE+20} y={7*TILE_SIZE+20} width={TILE_SIZE} height={TILE_SIZE} rx="8" fill={colors.yellow} />));
    homeTiles.push(...Array(6).fill(0).map((_,i) => <rect key={`hb${i}`} x={7*TILE_SIZE+20} y={(13-i)*TILE_SIZE+20} width={TILE_SIZE} height={TILE_SIZE} rx="8" fill={colors.blue} />));

    return (
        <g>
            {/* 四个角落的基地背景 */}
            <rect x="0" y="0" width="260" height="260" rx="20" fill={colors.red} />
            <rect x="380" y="0" width="260" height="260" rx="20" fill={colors.green} />
            <rect x="0" y="380" width="260" height="260" rx="20" fill={colors.blue} />
            <rect x="380" y="380" width="260" height="260" rx="20" fill={colors.yellow} />
            {/* 终点 */}
            <path d="M 280 280 H 360 V 360 H 280 Z" fill="#e1d6f5"/>
            {pathTiles}
            {homeTiles}
        </g>
    )
};

const LudoBoard = ({ user, socket }) => {
  const { gameState, room } = useLudoStore();

  if (!gameState || !room) return <Typography>正在加载游戏...</Typography>;

  const { players, current_player_id, dice_value, valid_moves, winner, last_message, player_order } = gameState;
  const isMyTurn = current_player_id === user.id;
  const canRollDice = isMyTurn && dice_value === null && !winner;

  const handleRollDice = () => canRollDice && socket.emit('ludo:roll_dice', { room_id: room.id });
  const handleMovePiece = (pieceId) => valid_moves.some(m => m.piece_id === pieceId) && socket.emit('ludo:move_piece', { room_id: room.id, piece_id: pieceId });

  return (
    <Grid container spacing={2} p={{xs: 1, sm: 2}} sx={{height: '100%', overflow: 'hidden'}}>
      <Grid item xs={12} md={7} lg={8} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: {xs: 'auto', md: '100%'} }}>
        {/* SVG 画布 */}
        <svg viewBox="0 0 640 640" style={{ width: '100%', maxWidth: 'calc(100vh - 80px)', maxHeight: 'calc(100vw - 350px)', aspectRatio: '1/1' }}>
          <BoardBackground />
          {Object.values(players).map(player => 
            Object.values(player.pieces).map(piece => (
              <Piece
                key={piece.id}
                playerColor={player.color}
                position={getPiecePosition(piece, player.color)}
                isMovable={isMyTurn && valid_moves.some(m => m.piece_id === piece.id)}
                onClick={() => handleMovePiece(piece.id)}
              />
            ))
          )}
        </svg>
      </Grid>

      {/* 状态和控制面板 (和之前一样，无需大改) */}
      <Grid item xs={12} md={5} lg={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '100%', overflowY: 'auto' }}>
         <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>游戏状态</Typography>
            <Typography variant="body1" sx={{minHeight: '40px', fontStyle: 'italic'}}>{last_message}</Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">轮到你了！</Typography>
            <Box sx={{ height: 80, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Dice value={dice_value} />
            </Box>
            <motion.div whileHover={{ scale: canRollDice ? 1.05 : 1 }} whileTap={{ scale: canRollDice ? 0.95 : 1 }}>
                <Button variant="contained" fullWidth size="large" onClick={handleRollDice} disabled={!canRollDice} startIcon={<FaDice />} sx={{py: 1.5, textTransform: 'uppercase', fontWeight: 'bold'}}>
                  {canRollDice ? '掷骰子' : (winner ? '游戏结束' : `等待 ${players[current_player_id]?.username || ''}...`)}
                </Button>
            </motion.div>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>玩家顺序</Typography>
          {player_order.map(pid => {
            const player = players[pid];
            const isCurrent = current_player_id === pid;
            return <Chip key={pid} avatar={<Avatar sx={{ bgcolor: player.color, color: 'white', p: 0.5 }}>{player.is_ai ? <FaRobot size={14}/> : <FaUser size={12} />}</Avatar>} label={player.username} variant={isCurrent ? 'filled' : 'outlined'} color={isCurrent ? "primary" : "default"} icon={room.host_id === pid ? <FaCrown /> : undefined} sx={{ m: 0.5, transition: 'all 0.3s ease', boxShadow: isCurrent ? 6 : 1, transform: isCurrent ? 'scale(1.05)' : 'scale(1)' }}/>
          })}
        </Paper>
      </Grid>
      
      <Dialog open={!!winner}>
        <DialogTitle sx={{textAlign: 'center', fontSize: '2rem'}}>🎉 游戏结束！ 🎉</DialogTitle>
        <DialogContent sx={{textAlign: 'center'}}> <Typography variant="h5">恭喜玩家 <strong>{players[winner]?.username}</strong> 获得了胜利！</Typography> </DialogContent>
      </Dialog>
    </Grid>
  );
};

export default LudoBoard;
