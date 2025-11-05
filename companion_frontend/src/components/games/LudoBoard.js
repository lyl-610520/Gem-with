// src/components/games/LudoBoard.js
import React from 'react';
import { Box, Paper, Typography, Button, Chip, Grid, Dialog, DialogTitle, DialogContent, Avatar } from '@mui/material';
import { FaUser, FaCrown, FaRobot } from 'react-icons/fa';
import useLudoStore from '../../stores/ludoStore';
import { getPiecePosition } from './ludoBoardUtils';
import Piece from './Piece';
import Dice from './Dice';

// ===================================================================
// BoardBackground: 外包写的精美SVG棋盘背景 (我们直接嵌入)
// ===================================================================
const BoardBackground = () => {
    const CELL_SIZE = 40;
    const PADDING = 20;
    const COLORS = {
        red: { main: '#ffb3ba', light: '#ffe4e6' },
        green: { main: '#baffc9', light: '#e8ffe8' },
        yellow: { main: '#ffffba', light: '#fffef0' },
        blue: { main: '#bae1ff', light: '#e0f2ff' },
        path: { main: '#ffffff', safe: '#fef3c7' },
        border: '#e2e8f0',
    };

    const mainPath = [
        ...Array.from({ length: 5 }, (_, i) => ({ x: i, y: 6 })), 
        ...Array.from({ length: 5 }, (_, i) => ({ x: 6, y: 5 - i })),
        { x: 7, y: 0 }, { x: 8, y: 0 },
        ...Array.from({ length: 5 }, (_, i) => ({ x: 8, y: 1 + i })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: 9 + i, y: 6 })),
        { x: 14, y: 7 }, { x: 14, y: 8 },
        ...Array.from({ length: 5 }, (_, i) => ({ x: 13 - i, y: 8 })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: 8, y: 9 + i })),
        { x: 7, y: 14 }, { x: 6, y: 14 },
        ...Array.from({ length: 5 }, (_, i) => ({ x: 6, y: 13 - i })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: 5 - i, y: 8 })),
        { x: 0, y: 7 },
    ];
    
    const homePaths = {
        red: Array.from({ length: 6 }, (_, i) => ({ x: 1 + i, y: 7 })),
        green: Array.from({ length: 6 }, (_, i) => ({ x: 7, y: 1 + i })),
        yellow: Array.from({ length: 6 }, (_, i) => ({ x: 13 - i, y: 7 })),
        blue: Array.from({ length: 6 }, (_, i) => ({ x: 7, y: 13 - i })),
    };

    const baseAreas = {
        red: { x: 0, y: 0 }, green: { x: 9, y: 0 }, yellow: { x: 9, y: 9 }, blue: { x: 0, y: 9 },
    };

    return (
        <g>
            {/* 基地 */}
            {Object.entries(baseAreas).map(([color, coords]) => (
                <rect key={color} x={PADDING + coords.x * CELL_SIZE} y={PADDING + coords.y * CELL_SIZE} width={CELL_SIZE * 5} height={CELL_SIZE * 5} fill={COLORS[color].light} rx={15} />
            ))}
            {/* 路径 */}
            {mainPath.map((cell, i) => (
                <rect key={`path-${i}`} x={PADDING + cell.x * CELL_SIZE} y={PADDING + cell.y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={COLORS.path.main} stroke={COLORS.border} strokeWidth={1} rx={8} />
            ))}
            {/* 回家路径 */}
            {Object.entries(homePaths).map(([color, path]) => (
                path.map((cell, i) => (
                    <rect key={`home-${color}-${i}`} x={PADDING + cell.x * CELL_SIZE} y={PADDING + cell.y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={COLORS[color].main} stroke={COLORS[color].light} strokeWidth={1} rx={8} />
                ))
            ))}
             {/* 中心终点 */}
            <path d={`M ${PADDING + 6 * CELL_SIZE} ${PADDING + 7.5 * CELL_SIZE} L ${PADDING + 7.5 * CELL_SIZE} ${PADDING + 6 * CELL_SIZE} L ${PADDING + 9 * CELL_SIZE} ${PADDING + 7.5 * CELL_SIZE} L ${PADDING + 7.5 * CELL_SIZE} ${PADDING + 9 * CELL_SIZE} Z`} fill="#f3e8ff" />
        </g>
    );
};


// ===================================================================
// LudoBoard: 连接了 Zustand 状态管理的主组件
// ===================================================================
const LudoBoard = ({ user, socket }) => {
  const { gameState, room } = useLudoStore();

  if (!gameState || !room) return <Typography>正在加载游戏...</Typography>;

  const { players, current_player_id, dice_value, valid_moves, winner, last_message, player_order } = gameState;
  const isMyTurn = current_player_id === user.id;
  const canRollDice = isMyTurn && dice_value === null && !winner;

  // 连接到后端的事件处理器
  const handleRollDice = () => canRollDice && socket.emit('ludo:roll_dice', { room_id: room.id });
  const handleMovePiece = (pieceId) => valid_moves.some(m => m.piece_id === pieceId) && socket.emit('ludo:move_piece', { room_id: room.id, piece_id: pieceId });

  return (
    <Grid container spacing={2} p={{xs: 1, sm: 2}} sx={{height: '100%', overflow: 'hidden'}}>
      {/* 棋盘区域 */}
      <Grid item xs={12} md={7} lg={8} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: {xs: 'auto', md: '100%'} }}>
        <svg viewBox={`0 0 ${15 * CELL_SIZE + PADDING * 2} ${15 * CELL_SIZE + PADDING * 2}`} style={{ width: '100%', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}>
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

      {/* 状态和控制面板 */}
      <Grid item xs={12} md={5} lg={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '100%', overflowY: 'auto' }}>
         <Paper elevation={3} sx={{ p: 2, borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom>游戏状态</Typography>
            <Typography variant="body1" sx={{minHeight: '40px', fontStyle: 'italic'}}>{last_message}</Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, textAlign: 'center', borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom>
              {canRollDice ? "轮到你了！" : (winner ? "游戏结束" : "请稍候...")}
            </Typography>
            <Box sx={{ height: 80, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Dice value={dice_value} onRoll={handleRollDice} disabled={!canRollDice} />
            </Box>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1, borderRadius: 4 }}>
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
