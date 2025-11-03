import React from 'react';
import { Box, Paper, Typography, Button, Chip, Grid, Dialog, DialogTitle, DialogContent, DialogContentText } from '@mui/material';
import { FaUser, FaCrown, FaDice } from 'react-icons/fa';
import useLudoStore from '../../stores/ludoStore';
import { getPieceGridPosition, getCellColor } from './ludoBoardUtils';
import Piece from './Piece';
import Dice from './Dice';

const LudoBoard = ({ user, socket }) => {
  const { gameState, room } = useLudoStore();

  if (!gameState || !room) {
    return <Typography>正在加载游戏...</Typography>;
  }

  const { players, current_player_id, dice_value, valid_moves, winner, last_message, player_order } = gameState;
  const isMyTurn = current_player_id === user.id;
  const canRollDice = isMyTurn && dice_value === null;

  const handleRollDice = () => {
    if (canRollDice) {
      socket.emit('ludo:roll_dice', { room_id: room.id });
    }
  };

  const handleMovePiece = (pieceId) => {
    socket.emit('ludo:move_piece', { room_id: room.id, piece_id: pieceId });
  };
  
  const boardCells = Array.from({ length: 15 * 15 }).map((_, i) => {
    const r = Math.floor(i / 15) + 1;
    const c = (i % 15) + 1;
    return <Box key={`${r}-${c}`} sx={{ gridRow: r, gridColumn: c, backgroundColor: getCellColor(r, c), border: '1px solid #eee' }} />;
  });

  return (
    <Grid container spacing={2} p={2} sx={{maxHeight: '85vh'}}>

      {/* 棋盘区域 */}
      <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            gridTemplateRows: 'repeat(15, 1fr)',
            width: '100%',
            maxWidth: '70vh', // 限制最大宽度
            aspectRatio: '1 / 1', // 保持正方形
            position: 'relative',
            backgroundColor: '#f5f5f5'
          }}
        >
          {boardCells}
          {Object.values(players).map(player => 
            Object.values(player.pieces).map(piece => {
              const isMovable = isMyTurn && valid_moves.some(m => m.piece_id === piece.id);
              return (
                <Piece
                  key={piece.id}
                  playerColor={player.color}
                  gridPos={getPieceGridPosition(piece, player.color)}
                  isMovable={isMovable}
                  onClick={isMovable ? () => handleMovePiece(piece.id) : undefined}
                />
              );
            })
          )}
        </Box>
      </Grid>

      {/* 状态和控制面板 */}
      <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>游戏状态</Typography>
            <Typography variant="body2" sx={{minHeight: '40px'}}>{last_message}</Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>玩家顺序</Typography>
          {player_order.map(pid => {
            const player = players[pid];
            const isCurrent = current_player_id === pid;
            return(
              <Chip
                key={pid}
                avatar={<Avatar sx={{ bgcolor: player.color, color: 'white' }}>{player.is_ai ? 'AI' : <FaUser />}</Avatar>}
                label={player.username}
                variant={isCurrent ? 'filled' : 'outlined'}
                color={isCurrent ? "primary" : "default"}
                icon={room.host_id === pid ? <FaCrown /> : undefined}
                sx={{ m: 0.5, boxShadow: isCurrent ? 3 : 0, transform: isCurrent ? 'scale(1.05)' : 'scale(1)' }}
              />
            )
          })}
        </Paper>
        <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">掷骰子</Typography>
            <Box sx={{ height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Dice value={dice_value} />
            </Box>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleRollDice} 
              disabled={!canRollDice}
              startIcon={<FaDice />}
            >
              {isMyTurn ? '掷骰子' : `等待 ${players[current_player_id]?.username || ''} 操作...`}
            </Button>
        </Paper>
      </Grid>
      
      {/* 游戏结束弹窗 */}
      <Dialog open={!!winner}>
        <DialogTitle>游戏结束！</DialogTitle>
        <DialogContent>
          <DialogContentText>
            恭喜玩家 <strong>{players[winner]?.username}</strong> 获得了胜利！
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Grid>
  );
};

export default LudoBoard;
