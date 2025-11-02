// src/components/friends/FriendListComponent.js

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import ChatWindow from './ChatWindow';
import useFriendChatStore from '../../stores/friendChatStore';

const FriendListWrapper = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  height: 70vh;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: ${props => props.theme.borderRadius};
  overflow-y: auto;
`;

const FriendItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const FriendInfo = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-grow: 1;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.8;
  }
`;

const StatusIndicator = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 15px;
  background-color: ${props => props.isOnline ? '#48bb78' : '#a0aec0'};
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UnreadBadge = styled.div`
  background-color: #e53e3e;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
`;

const DeleteButton = styled.button`
  background-color: #e53e3e;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  ${FriendItem}:hover & {
    opacity: 1;
  }
`;

const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: ${props => props.theme.borderRadius};
  color: ${props => props.theme.textLight};
`;

function FriendListComponent({ user, socket }) {
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  
  const unreadCounts = useFriendChatStore((state) => state.unreadCounts);
  const addMessage = useFriendChatStore((state) => state.addMessage);
  const clearUnreadCount = useFriendChatStore((state) => state.clearUnreadCount);
  const setActiveIds = useFriendChatStore((state) => state.setActiveIds);

  useEffect(() => {
    setActiveIds(activeChat ? activeChat.id : null, user.id);
  }, [activeChat, user.id, setActiveIds]);

  useEffect(() => {
    if (!socket) return;

    axios.get('/friends').then(res => setFriends(res.data));

    const handleStatusUpdate = ({ user_id, status }) => {
      setFriends(prev => prev.map(f => f.id === user_id ? { ...f, is_online: status === 'online' } : f));
    };
    const handleReceiveMessage = (message) => {
  console.log('📩 收到私信:', message);
  console.log('👤 当前用户ID:', user.id);
  console.log('📨 发送者ID:', message.from_user_id);
  console.log('📬 接收者ID:', message.to_user_id);
  
  // 手动计算应该存到哪个好友ID下
  const friendId = message.from_user_id === user.id 
    ? message.to_user_id 
    : message.from_user_id;
  console.log('🎯 应该存到的好友ID:', friendId);
  console.log('💬 当前打开的聊天对象:', activeChat?.id);
  
  addMessage(message, user.id);
  
  // 调用后检查 store 状态
  const storeState = useFriendChatStore.getState();
  console.log('💾 Store 中的聊天记录:', storeState.chats);
  console.log('🔢 未读计数:', storeState.unreadCounts);
};

    socket.on('friend_status_update', handleStatusUpdate);
    socket.on('receive_private_message', handleReceiveMessage);

    return () => {
      socket.off('friend_status_update', handleStatusUpdate);
      socket.off('receive_private_message', handleReceiveMessage);
    };
  }, [socket, addMessage]);

  const handleFriendClick = (friend) => {
    setActiveChat(friend);
    clearUnreadCount(friend.id);
  };

  const handleRemoveFriend = async (friendId) => {
    if (window.confirm("确定要删除这位好友吗？")) {
      try {
        await axios.post('/friends/remove', { friend_id: friendId });
        setFriends(prev => prev.filter(f => f.id !== friendId));
        if (activeChat && activeChat.id === friendId) {
          setActiveChat(null);
        }
      } catch (error) {
        console.error("删除好友失败:", error);
        alert("删除好友失败，请稍后再试。");
      }
    }
  };

  return (
    <FriendListWrapper>
      <List>
        {friends.map(friend => (
          <FriendItem key={friend.id}>
            <FriendInfo onClick={() => handleFriendClick(friend)}>
              <StatusIndicator isOnline={friend.is_online} />
              <span>{friend.username}</span>
            </FriendInfo>
            <ActionsContainer>
              <DeleteButton onClick={() => handleRemoveFriend(friend.id)}>
                删除
              </DeleteButton>
              {unreadCounts[friend.id] > 0 && (
                <UnreadBadge>{unreadCounts[friend.id]}</UnreadBadge>
              )}
            </ActionsContainer>
          </FriendItem>
        ))}
      </List>
      <div>
        {activeChat ? (
          <ChatWindow currentUser={user} chatPartner={activeChat} socket={socket} />
        ) : (
          <Placeholder>选择一位好友开始聊天</Placeholder>
        )}
      </div>
    </FriendListWrapper>
  );
}

export default FriendListComponent;
