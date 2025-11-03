import React, { useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
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
    
    const onGameStarted = (roomData) => {
      console.log('EVENT: ludo:game_started', roomData);
      updateRoom(roomData); // 更新房间状态为 in_progress
      updateGameState(roomData.game_state);
    };

    const onError = (errorData) => {
      alert(`错误: ${errorData.message}`);
    };

    // 绑定事件
    socket.on('ludo:room_update', onRoomUpdate);
    socket.on('ludo:game_state_update', onGameStateUpdate);
    socket.on('ludo:game_started', onGameStarted);
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
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, minWidth: { xs: '90vw', sm: '80vw', md: 800 }, minHeight: 500 }}>
       <Button onClick={onClose} sx={{position: 'absolute', top: 8, right: 8}}>关闭</Button>
       {renderContent()}
    </Box>
  );
};

export default LudoGame;
