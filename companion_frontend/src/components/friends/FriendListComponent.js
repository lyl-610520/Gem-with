import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import ChatWindow from './ChatWindow'; // 我们马上就创建它
import useFriendChatStore from '../../stores/friendChatStore'; // <-- 1. 导入 store

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

const UnreadBadge = styled.div`
  background-color: #e53e3e;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto; // 把它推到最右边
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
  
  // 2. 从 store 中获取需要的数据和方法
  const unreadCounts = useFriendChatStore((state) => state.unreadCounts);
  const addMessage = useFriendChatStore((state) => state.addMessage);
  const clearUnreadCount = useFriendChatStore((state) => state.clearUnreadCount);
  const setActiveIds = useFriendChatStore((state) => state.setActiveIds);

  useEffect(() => {
    // 3. 每次 activeChat 或 user 变化时，都通知 store
    setActiveIds(activeChat ? activeChat.id : null, user.id);
  }, [activeChat, user.id, setActiveIds]);

  useEffect(() => {
    if (!socket) return; // 安全检查

    // 1. 获取好友列表
    axios.get('/friends').then(res => {
      setFriends(res.data);
    });

    // 2. [修复] 监听正确的在线状态更新事件
    const handleStatusUpdate = ({ user_id, status }) => {
      const isOnline = status === 'online'; // 后端发来 'online' 或 'offline'
      setFriends(prev => prev.map(f => f.id === user_id ? { ...f, is_online: isOnline } : f));
    };

    // 3. [新] 监听所有私聊消息
    const handleReceiveMessage = (message) => {
      addMessage(message); // 直接把消息交给 store 处理
    };

    socket.on('friend_status_update', handleStatusUpdate);
    socket.on('receive_private_message', handleReceiveMessage);

    // 4. 组件卸载时，清理所有监听器
    return () => {
      socket.off('friend_status_update', handleStatusUpdate);
      socket.off('receive_private_message', handleReceiveMessage);
    };
  }, [socket, addMessage]); // 依赖数组里加入 addMessage

  const handleFriendClick = (friend) => {
    setActiveChat(friend);
    clearUnreadCount(friend.id); // 点开聊天，清除未读
  };

  return (
    <FriendListWrapper>
      <List>
        {friends.map(friend => (
          <FriendItem key={friend.id} onClick={() => handleFriendClick(friend)}>
            <StatusIndicator isOnline={friend.is_online} />
            <span>{friend.username}</span>
            {unreadCounts[friend.id] > 0 && (
              <UnreadBadge>{unreadCounts[friend.id]}</UnreadBadge>
            )}
          </FriendItem>
        ))}
      </List>
      <div>
        {activeChat ? (
          // 4. 把 user 重命名为 currentUser 传递给 ChatWindow，避免混淆
          <ChatWindow currentUser={user} chatPartner={activeChat} socket={socket} />
        ) : (
          <Placeholder>选择一位好友开始聊天</Placeholder>
        )}
      </div>
    </FriendListWrapper>
  );
}

export default FriendListComponent;
