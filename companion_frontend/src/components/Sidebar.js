import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { 
  FaHome, 
  FaBook, 
  FaCheckCircle, 
  FaMusic, 
  FaBookOpen, 
  FaGamepad, 
  FaComments, 
  FaCog,
  FaBars,
  FaTimes
} from 'react-icons/fa';

const SidebarContainer = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 250px;
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-right: 1px solid ${props => props.theme.border};
  transform: translateX(${props => props.isOpen ? '0' : '-100%'});
  transition: transform 0.3s ease;
  z-index: 1000;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    width: 100%;
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Username = styled.div`
  font-weight: 600;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
`;

const UserStatus = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textLight};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textLight};
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  
  &:hover {
    color: ${props => props.theme.text};
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const NavMenu = styled.nav`
  padding: 20px 0;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: ${props => props.theme.textLight};
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: ${props => props.theme.primary};
    border-left-color: ${props => props.theme.primary};
  }
  
  &.active {
    background: rgba(99, 102, 241, 0.15);
    color: ${props => props.theme.primary};
    border-left-color: ${props => props.theme.primary};
    font-weight: 600;
  }
`;

const NavIcon = styled.div`
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
`;

const NavText = styled.span`
  font-size: 0.95rem;
`;

const SidebarFooter = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  padding: 15px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  text-align: center;
`;

const FooterText = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textLight};
  margin-bottom: 5px;
`;

const FooterSubtext = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.textLight};
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: ${props => props.show ? 'block' : 'none'};
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const menuItems = [
  { path: '/', icon: FaHome, text: '首页' },
  { path: '/diary', icon: FaBook, text: '日记' },
  { path: '/checkin', icon: FaCheckCircle, text: '打卡' },
  { path: '/music', icon: FaMusic, text: '音乐' },
  { path: '/reading', icon: FaBookOpen, text: '阅读' },
  { path: '/games', icon: FaGamepad, text: '游戏' },
  { path: '/chat', icon: FaComments, text: '聊天' },
  { path: '/settings', icon: FaCog, text: '设置' }
];

function Sidebar({ isOpen, onToggle, user }) {
  return (
    <>
      <Overlay show={isOpen} onClick={onToggle} />
      <SidebarContainer isOpen={isOpen}>
        <SidebarHeader>
          <UserInfo>
            <Username>{user?.username || '用户'}</Username>
            <UserStatus>在线</UserStatus>
          </UserInfo>
          <CloseButton onClick={onToggle}>
            <FaTimes />
          </CloseButton>
        </SidebarHeader>
        
        <NavMenu>
          {menuItems.map((item) => (
            <NavItem key={item.path} to={item.path}>
              <NavIcon>
                <item.icon />
              </NavIcon>
              <NavText>{item.text}</NavText>
            </NavItem>
          ))}
        </NavMenu>
        
        <SidebarFooter>
          <FooterText>🌟 陪伴空间</FooterText>
          <FooterSubtext>与Gemini一起的温馨时光</FooterSubtext>
        </SidebarFooter>
      </SidebarContainer>
    </>
  );
}

export default Sidebar;