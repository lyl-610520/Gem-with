import React, { useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FaPlus } from 'react-icons/fa';

import useLudoStore from '../../stores/ludoStore';
import LudoLobby from './LudoLobby';
import LudoBoard from './LudoBoard';

const LudoGame = ({ user, socket, onClose }) => {
  const { inRoom, room, updateRoom, updateGameState, reset } = useLudoStore();

  useEffect(() => {
    if (!socket) return;

    // --- 核心监听器 ---

    // 监听房间结构的变化 (玩家加入/离开, 房主变更)
    const onRoomUpdate = (roomData) => {
      console.log('EVENT: ludo:room_update', roomData);
      updateRoom(roomData);
      // 安全措施：如果房间更新里也带了游戏状态，就同步一下
      if (roomData.game_state) {
        updateGameState(roomData.game_state);
      }
    };
    
    // 监听游戏内部状态的变化 (掷骰子, 移动棋子)
    const onGameStateUpdate = (gameStateData) => {
      console.log('EVENT: ludo:game_state_update', gameStateData);
      updateGameState(gameStateData);
      
      // [关键修复] 当我们收到游戏状态更新时，
      // 意味着游戏已开始或进行中，要确保房间状态同步，这样UI才能从大厅切换到棋盘
      const currentRoom = useLudoStore.getState().room;
      if (currentRoom && currentRoom.status !== 'in_progress') {
          const updatedRoom = { ...currentRoom, status: 'in_progress' };
          updateRoom(updatedRoom);
      }
    };
    
    // 监听从服务器发来的错误信息
    const onError = (errorData) => {
      alert(`游戏错误: ${errorData.message}`);
    };

    // 绑定事件
    socket.on('ludo:room_update', onRoomUpdate);
    socket.on('ludo:game_state_update', onGameStateUpdate);
    socket.on('ludo:error', onError);

    // 组件卸载时，执行清理
    return () => {
      socket.off('ludo:room_update', onRoomUpdate);
      socket.off('ludo:game_state_update', onGameStateUpdate);
      socket.off('ludo:error', onError); // <--- 修正了这里

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
        <Box textAlign="center" p={5} display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress />
          <Typography mt={2}>正在连接到游戏服务器...</Typography>
        </Box>
      );
    }

    if (!inRoom || !room) {
      return (
        <Box textAlign="center" p={3} display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
          <Typography variant="h3" gutterBottom>飞行棋大作战</Typography>
          <Typography color="text.secondary" mb={4}>邀请好友，或与AI一较高下！</Typography>
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
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      bgcolor: 'background.default',
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
  );
};

export default LudoGame;
