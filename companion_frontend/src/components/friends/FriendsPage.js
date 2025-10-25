import React, { useState } from 'react';
import styled from 'styled-components';
import FriendListComponent from './FriendListComponent'; // 我们稍后会创建这个文件

const FriendsWrapper = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid ${props => props.theme.border};
`;

const TabButton = styled.button`
  padding: 10px 20px;
  border: none;
  background: none;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.active ? props.theme.primary : props.theme.textLight};
  border-bottom: 3px solid ${props => props.active ? props.theme.primary : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.primary};
  }
`;

function FriendsPage({ user, socket }) { // 我们需要从 App.js 传入 socket
  const [activeTab, setActiveTab] = useState('list');

  return (
    <FriendsWrapper>
      <Title>💌 好友</Title>
      <TabContainer>
        <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')}>我的好友</TabButton>
        <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>好友请求</TabButton>
        <TabButton active={activeTab === 'add'} onClick={() => setActiveTab('add')}>添加好友</TabButton>
      </TabContainer>

      <div>
        {activeTab === 'list' && <FriendListComponent user={user} socket={socket} />}
        {activeTab === 'requests' && <div>好友请求功能待开发...</div>}
        {activeTab === 'add' && <div>添加好友功能待开发...</div>}
      </div>
    </FriendsWrapper>
  );
}

export default FriendsPage;
