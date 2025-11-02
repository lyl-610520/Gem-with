// src/components/friends/FriendsPage.js (最终重构版)
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper, Dialog, DialogContent } from '@mui/material';
import { FaUserFriends, FaUserPlus, FaEnvelopeOpenText } from 'react-icons/fa';
import axios from 'axios';

import FriendListComponent from './FriendListComponent';
import FriendRequestsComponent from './FriendRequestsComponent';
import AddFriendComponent from './AddFriendComponent';
import ChatWindow from './ChatWindow';
import useFriendChatStore from '../../stores/friendChatStore';

function FriendsPage({ user, socket }) {
  const [activeTab, setActiveTab] = useState(0);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [chatPartner, setChatPartner] = useState(null);

  const clearUnreadCount = useFriendChatStore((state) => state.clearUnreadCount);
  const setActiveIds = useFriendChatStore((state) => state.setActiveIds);

  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        axios.get('/friends'),
        axios.get('/friends/requests'),
      ]);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (error) { console.error("获取好友数据失败:", error); }
  };

  useEffect(() => {
    fetchData();
    if (!socket) return;
    
    // 设置 WebSocket 监听器
    const handleStatusUpdate = ({ user_id, status }) => {
      setFriends(prev => prev.map(f => f.id === user_id ? { ...f, is_online: status === 'online' } : f));
    };
    const handleNewRequest = () => fetchData();
    const handleRequestAccepted = () => fetchData();

    socket.on('friend_status_update', handleStatusUpdate);
    socket.on('new_friend_request', handleNewRequest);
    socket.on('request_accepted', handleRequestAccepted);

    return () => {
      socket.off('friend_status_update', handleStatusUpdate);
      socket.off('new_friend_request', handleNewRequest);
      socket.off('request_accepted', handleRequestAccepted);
    };
  }, [socket]);

  useEffect(() => {
    setActiveIds(chatPartner ? chatPartner.id : null, user.id);
  }, [chatPartner, user.id, setActiveIds]);

  const handleTabChange = (event, newValue) => setActiveTab(newValue);

  const handleAction = async (action, requestId) => {
    await axios.post(`/friends/${action}`, { request_id: requestId });
    fetchData();
  };
  
  const handleRemoveFriend = async (friendId) => {
    if (window.confirm("确定要删除这位好友吗？")) {
      await axios.post('/friends/remove', { friend_id: friendId });
      fetchData();
    }
  };

  const handleOpenChat = (friend) => {
    setChatPartner(friend);
    clearUnreadCount(friend.id);
  };
  
  return (
    <Box maxWidth="1200px" mx="auto" p={{ xs: 1, sm: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        💌 好友中心
      </Typography>
      
      <Paper elevation={0} sx={{ borderRadius: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab icon={<FaUserFriends />} iconPosition="start" label="我的好友" />
          <Tab icon={<FaEnvelopeOpenText />} iconPosition="start" label="好友请求" />
          <Tab icon={<FaUserPlus />} iconPosition="start" label="添加好友" />
        </Tabs>
        
        <Box p={3}>
          {activeTab === 0 && <FriendListComponent friends={friends} onSelectChat={handleOpenChat} onRemoveFriend={handleRemoveFriend} />}
          {activeTab === 1 && <FriendRequestsComponent requests={requests} onAccept={(id) => handleAction('accept', id)} onReject={(id) => handleAction('reject', id)} />}
          {activeTab === 2 && <AddFriendComponent />}
        </Box>
      </Paper>

      {/* 聊天窗口的模态框 */}
      <Dialog open={!!chatPartner} onClose={() => setChatPartner(null)} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: 0 }}>
          {chatPartner && <ChatWindow currentUser={user} chatPartner={chatPartner} socket={socket} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default FriendsPage;
