import React, { useState } from 'react';
import styled from 'styled-components';

// [修复] 导入所有需要的子组件，而不仅仅是 FriendListComponent
import FriendListComponent from './FriendListComponent';
import FriendRequestsComponent from './FriendRequestsComponent';
import AddFriendComponent from './AddFriendComponent';

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

function FriendsPage({ user, socket }) {
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
        {/* [修复] 使用真正的组件替换掉 “待开发” 的 div */}
        {activeTab === 'list' && <FriendListComponent user={user} socket={socket} />}
        {activeTab === 'requests' && <FriendRequestsComponent socket={socket} />}
        {activeTab === 'add' && <AddFriendComponent />}
      </div>
    </FriendsWrapper>
  );
}

export default FriendsPage;
