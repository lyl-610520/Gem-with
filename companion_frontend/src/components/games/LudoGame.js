import React, { useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FaPlus } from 'react-icons/fa';

import useLudoStore from '../../stores/ludoStore';
import LudoLobby from './LudoLobby'; // 我们即将创建
import LudoBoard from './LudoBoard'; // 我们即将创建

const LudoGame = ({ user, socket, onClose }) => {
  const { inRoom, room, updateRoom, updateGameState, reset } = useLudoStore();

  useEffect(() => {
    if (!socket) return;

    // --- 核心监听器 ---
    const onRoomUpdate = (roomData) => {
      console.log('EVENT: ludo:room_update', roomData);
      updateRoom(roomData);
    };

    const onGameStateUpdate = (gameStateData) => {
      console.log('EVENT: ludo:game_state_update', gameStateData);
      updateGameState(gameStateData);
    };
    
    const onRoomUpdate = (roomData) => {
      console.log('EVENT: ludo:room_update', roomData);
      updateRoom(roomData);
      // 如果房间更新信息里包含了游戏状态，也一并更新
      if (roomData.game_state) {
        updateGameState(roomData.game_state);
      }
    };
    
    // VVVV 在这里修改 VVVV
    // 我们不再需要单独的 onGameStarted 监听器，
    // 因为后端开始游戏后会直接发送 game_state_update 事件。
    // 我们只需要把 onGameStateUpdate 改得更聪明一点。

    const onGameStateUpdate = (gameStateData) => {
      console.log('EVENT: ludo:game_state_update', gameStateData);
      updateGameState(gameStateData);
      
      // [关键修复] 当我们收到游戏状态更新时，
      // 说明游戏已经开始或正在进行，所以我们要确保房间的 status 是 'in_progress'
      const currentRoom = useLudoStore.getState().room;
      if (currentRoom && currentRoom.status !== 'in_progress') {
          // 创建一个新的 room 对象来更新状态，避免直接修改
          const updatedRoom = { ...currentRoom, status: 'in_progress' };
          updateRoom(updatedRoom);
      }
    };
    // ^^^^ 修改结束 ^^^^

    // 绑定事件
    socket.on('ludo:room_update', onRoomUpdate);
    socket.on('ludo:game_state_update', onGameStateUpdate);
    socket.on('ludo:error', onError);

    // 组件卸载时，执行清理
    return () => {
      socket.off('ludo:room_update', onRoomUpdate);
      socket.off('ludo:game_state_update', onGameStateUpdate);
      socket.off('ludo:game_started', onGameStarted);
      socket.off('ludo:error', onError);

      // 如果玩家还在房间里就关闭了组件，自动发送离开房间的事件
      const currentRoom = useLudoStore.getState().room;
      if (currentRoom) {
        socket.emit('ludo:leave_room', { room_id: currentRoom.id });
      }
      reset(); // 清空 store
    };
  }, [socket, updateRoom, updateGameState, reset]);

  const handleCreateRoom = () => {
    if (socket) {
      socket.emit('ludo:create_room');
    }
  };

  const renderContent = () => {
    if (!socket) {
      return (
        <Box textAlign="center">
          <CircularProgress />
          <Typography>正在连接到游戏服务器...</Typography>
        </Box>
      );
    }

    if (!inRoom || !room) {
      return (
        <Box textAlign="center" p={3}>
          <Typography variant="h5" gutterBottom>欢迎来到飞行棋</Typography>
          <Button variant="contained" size="large" onClick={handleCreateRoom} startIcon={<FaPlus />}>
            创建新房间
          </Button>
        </Box>
      );
    }
    
    // 根据房间状态决定显示大厅还是棋盘
    if (room.status === 'waiting') {
      return <LudoLobby user={user} socket={socket} />;
    } else if (room.status === 'in_progress') {
      return <LudoBoard user={user} socket={socket} />;
    }
  };

  return (
    // VVVV 修改 Box 的样式以适应全屏 VVVV
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      bgcolor: 'background.default', // 使用主题背景色
      display: 'flex',
      flexDirection: 'column'
    }}>
       <IconButton 
         onClick={onClose} 
         sx={{position: 'absolute', top: 16, right: 16, zIndex: 1300, bgcolor: 'rgba(0,0,0,0.2)', '&:hover': {bgcolor: 'rgba(0,0,0,0.4)'} }}
       >
         <CloseIcon sx={{color: 'white'}} />
       </IconButton>
       {renderContent()}
    </Box>
    // ^^^^
  );
};

export default LudoGame;
