// src/components/games/LudoBoard.js
import React from 'react';
import { Box, Paper, Typography, Button, Chip, Grid, Dialog, DialogTitle, DialogContent, DialogContentText, Avatar } from '@mui/material';
import { FaUser, FaCrown, FaDice } from 'react-icons/fa';
import useLudoStore from '../../stores/ludoStore';
import { getPieceGridPosition, getCellColor, PATH_COORDINATES } from './ludoBoardUtils';
import Piece from './Piece';
import Dice from './Dice';
import { motion } from 'framer-motion';

const ARROW = (dir) => {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M12 2 L2 12 L12 22 L22 12 Z" fill="rgba(0,0,0,0.2)" />
    </svg>
  );
};

const LudoBoard = ({ user, socket }) => {
  const { gameState, room } = useLudoStore();

  if (!gameState || !room) return <Typography>加载中…</Typography>;

  const { players, current_player_id, dice_value, valid_moves, winner, last_message, player_order } = gameState;
  const isMyTurn = current_player_id === user.id;
  const canRoll = isMyTurn && dice_value === null;

  const roll = () => socket.emit('ludo:roll_dice', { room_id: room.id });
  const move = (pid) => socket.emit('ludo:move_piece', { room_id: room.id, piece_id: pid });

  /** 15×15 网格 + 箭头装饰 */
  const cells = [];
  for (let r = 1; r <= 15; r++) {
    for (let c = 1; c <= 15; c++) {
      const isPath = PATH_COORDINATES.some(p => p.r === r && p.c === c);
      const arrow = (() => {
        if (r === 7 && c >= 2 && c <= 6) return 'right';
        if (c === 7 && r >= 2 && r <= 6) return 'down';
        if (r === 2 && c >= 8 && c <= 9) return 'right';
        if (c === 10 && r >= 2 && r <= 6) return 'down';
        if (r === 7 && c >= 11 && c <= 15) return 'right';
        if (c === 15 && r >= 8 && r <= 9) return 'down';
        if (r === 10 && c >= 11 && c <= 15) return 'left';
        if (c === 10 && r >= 11 && r <= 15) return 'down';
        if (r === 15 && c >= 8 && c <= 9) return 'left';
        if (c === 7 && r >= 11 && r <= 15) return 'up';
        if (r === 10 && c >= 2 && c <= 6) return 'left';
        if (c === 2 && r >= 8 && r <= 9) return 'up';
        return null;
      })();

      cells.push(
        <Box
          key={`${r}-${c}`}
          sx={{
            gridRow: r,
            gridColumn: c,
            background: getCellColor(r, c),
            borderRadius: 1,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {arrow && <Box sx={{ position: 'absolute', inset: 0 }}>{ARROW(arrow)}</Box>}
        </Box>
      );
    }
  }

  return (
    <Grid container spacing={2} p={2} sx={{ maxHeight: '100vh' }}>
      {/* 棋盘 */}
      <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15,1fr)',
            gridTemplateRows: 'repeat(15,1fr)',
            width: '100%',
            maxWidth: '70vh',
            aspectRatio: '1/1',
            background: '#212121',
            p: 0.5,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          {cells}

          {/* 棋子（使用 Framer Motion 做路径动画） */}
          {Object.values(players).map(p =>
            Object.values(p.pieces).map(piece => {
              const movable = isMyTurn && valid_moves.some(m => m.piece_id === piece.id);
              return (
                <Piece
                  key={piece.id}
                  playerColor={p.color}
                  gridPos={getPieceGridPosition(piece, p.color)}
                  isMovable={movable}
                  onClick={movable ? () => move(piece.id) : undefined}
                />
              );
            })
          )}
        </Box>
      </Grid>

      {/* 右侧面板 */}
      <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper elevation={6} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>提示</Typography>
          <Typography variant="body2" sx={{ minHeight: 40 }}>{last_message}</Typography>
        </Paper>

        <Paper elevation={6} sx={{ p: 2, flexGrow: 1, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>玩家</Typography>
          {player_order.map(pid => {
            const pl = players[pid];
            const cur = pid === current_player_id;
            return (
              <Chip
                key={pid}
                avatar={<Avatar sx={{ bgcolor: pl.color, color: '#fff' }}>{pl.is_ai ? 'AI' : <FaUser />}</Avatar>}
                label={pl.username}
                variant={cur ? 'filled' : 'outlined'}
                color={cur ? 'primary' : 'default'}
                icon={room.host_id === pid ? <FaCrown /> : undefined}
                sx={{ m: 0.5, transform: cur ? 'scale(1.06)' : 'scale(1)', transition: '0.2s' }}
              />
            );
          })}
        </Paper>

        <Paper elevation={6} sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>骰子</Typography>
          <Box sx={{ height: 70, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Dice value={dice_value} />
          </Box>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={roll}
            disabled={!canRoll}
            startIcon={<FaDice />}
            sx={{ mt: 1, borderRadius: 3 }}
          >
            {isMyTurn ? '掷骰子' : `等待 ${players[current_player_id]?.username}`}
          </Button>
        </Paper>
      </Grid>

      {/* 胜负弹窗 */}
      <Dialog open={!!winner} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: '#fff' }}>游戏结束！</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText>
            恭喜 <strong>{players[winner]?.username}</strong> 获胜！
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Grid>
  );
};

export default LudoBoard;
