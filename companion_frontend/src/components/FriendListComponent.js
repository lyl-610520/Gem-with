import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import ChatWindow from './ChatWindow'; // 我们马上就创建它

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
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.border};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const StatusIndicator = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 15px;
  background-color: ${props => props.isOnline ? '#48bb78' : '#a0aec0'};
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

  useEffect(() => {
    // 1. 组件加载时，获取好友列表
    axios.get('/friends').then(res => {
      setFriends(res.data);
    });

    // 2. 监听好友上线/下线事件
    const handleFriendOnline = ({ user_id }) => {
      setFriends(prev => prev.map(f => f.id === user_id ? { ...f, is_online: true } : f));
    };
    const handleFriendOffline = ({ user_id }) => {
      setFriends(prev => prev.map(f => f.id === user_id ? { ...f, is_online: false } : f));
    };

    socket.on('friend_online', handleFriendOnline);
    socket.on('friend_offline', handleFriendOffline);

    // 3. 组件卸载时，清理监听器
    return () => {
      socket.off('friend_online', handleFriendOnline);
      socket.off('friend_offline', handleFriendOffline);
    };
  }, [socket]);

  return (
    <FriendListWrapper>
      <List>
        {friends.map(friend => (
          <FriendItem key={friend.id} onClick={() => setActiveChat(friend)}>
            <StatusIndicator isOnline={friend.is_online} />
            <span>{friend.username}</span>
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
