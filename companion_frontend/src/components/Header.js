import React from 'react';
import styled from 'styled-components';
import { FaBars, FaSignOutAlt, FaBell } from 'react-icons/fa';

const HeaderContainer = styled.header`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${props => props.theme.border};
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.text};
  cursor: pointer;
  font-size: 1.2rem;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: ${props => props.theme.primary};
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin: 0;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const NotificationButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textLight};
  cursor: pointer;
  font-size: 1.1rem;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: ${props => props.theme.primary};
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
`;

const LogoutButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textLight};
  cursor: pointer;
  font-size: 1.1rem;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
`;

function Header({ user, onLogout, onToggleSidebar }) {
  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      onLogout();
    }
  };

  return (
    <HeaderContainer>
      <LeftSection>
        <MenuButton onClick={onToggleSidebar}>
          <FaBars />
        </MenuButton>
        <Title>陪伴空间</Title>
      </LeftSection>
      
      <RightSection>
        <NotificationButton>
          <FaBell />
          <NotificationBadge>3</NotificationBadge>
        </NotificationButton>
        
        <UserAvatar>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </UserAvatar>
        
        <LogoutButton onClick={handleLogout} title="退出登录">
          <FaSignOutAlt />
        </LogoutButton>
      </RightSection>
    </HeaderContainer>
  );
}

export default Header;