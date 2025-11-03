import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Button, IconButton, Tooltip, Chip, Avatar
} from '@mui/material';
import {
  FaUser, FaRobot, FaCrown, FaTimes, FaPlus, FaPaperPlane, FaDoorOpen, FaPlay
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useLudoStore from '../../stores/ludoStore';
import LudoInviteModal from './LudoInviteModal';

const LudoLobby = ({ user, socket }) => {
  const { room } = useLudoStore();
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  if (!room) return null; // 如果房间信息还未加载，不渲染任何东西

  const isHost = room.host_id === user.id;
  const players = Object.values(room.players);

  const handleLeaveRoom = () => {
    socket.emit('ludo:leave_room', { room_id: room.id });
  };

  const handleAddAI = () => {
    socket.emit('ludo:add_ai', { room_id: room.id });
  };

  const handleKickPlayer = (playerId) => {
    if (window.confirm('确定要将该玩家移出房间吗？')) {
      socket.emit('ludo:kick_player', { room_id: room.id, player_id: playerId });
    }
  };
  
  const handleStartGame = () => {
    if (players.length < 2) {
      alert('至少需要2名玩家才能开始游戏！');
      return;
    }
    socket.emit('ludo:start_game', { room_id: room.id });
  };


  const playerCardVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <>
      <Box p={{ xs: 2, sm: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">游戏大厅</Typography>
          <Chip label={`房间号: ${room.id}`} color="primary" variant="outlined" />
        </Box>

        <Grid container spacing={3}>
          {/* 玩家列表 */}
          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom>玩家列表 ({players.length}/4)</Typography>
            <Grid container spacing={2}>
              <AnimatePresence>
                {players.map((p, index) => (
                  <Grid item xs={12} sm={6} key={p.id}>
                    <motion.div
                      variants={playerCardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <Paper 
                        elevation={3} 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2,
                          position: 'relative',
                          borderLeft: `5px solid`,
                          borderColor: p.id === room.host_id ? 'primary.main' : 'transparent'
                        }}
                      >
                        {p.is_ai ? <FaRobot size={24} /> : <FaUser size={24} />}
                        <Typography variant="h6" noWrap>{p.username}</Typography>
                        
                        {p.id === room.host_id && (
                           <Tooltip title="房主">
                             <Box component="span" sx={{ color: 'gold', ml: 'auto' }}><FaCrown /></Box>
                           </Tooltip>
                        )}

                        {isHost && p.id !== user.id && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleKickPlayer(p.id)}
                            sx={{ position: 'absolute', top: 4, right: 4 }}
                          >
                            <FaTimes />
                          </IconButton>
                        )}
                      </Paper>
                    </motion.div>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          </Grid>

          {/* 操作面板 */}
          <Grid item xs={12} md={5}>
            <Typography variant="h6" gutterBottom>操作</Typography>
            <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                fullWidth 
                variant="contained" 
                color="secondary"
                startIcon={<FaPaperPlane />}
                onClick={() => setInviteModalOpen(true)}
              >
                邀请好友
              </Button>

              {isHost && (
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<FaPlus />}
                  onClick={handleAddAI}
                  disabled={players.length >= 4}
                >
                  添加电脑
                </Button>
              )}
              
              <Button 
                fullWidth 
                variant="outlined" 
                color="error"
                startIcon={<FaDoorOpen />}
                onClick={handleLeaveRoom}
              >
                离开房间
              </Button>

              {isHost && (
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="primary"
                  size="large"
                  startIcon={<FaPlay />}
                  onClick={handleStartGame}
                  sx={{ mt: 2 }}
                >
                  开始游戏
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <LudoInviteModal
        open={isInviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        socket={socket}
        roomId={room.id}
      />
    </>
  );
};

export default LudoLobby;
