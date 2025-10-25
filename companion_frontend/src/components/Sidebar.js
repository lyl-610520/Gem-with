// src/components/Sidebar.js (最终重构版)

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Avatar, useTheme, useMediaQuery } from '@mui/material';
import { 
  FaHome, FaBook, FaCheckCircle, FaMusic, FaBookOpen, 
  FaGamepad, FaComments, FaCog 
} from 'react-icons/fa';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

const drawerWidth = 250;

const menuItems = [
  { path: '/', icon: FaHome, text: '首页' },
  { path: '/diary', icon: FaBook, text: '日记' },
  { path: '/checkin', icon: FaCheckCircle, text: '打卡' },
  { path: '/music', icon: FaMusic, text: '音乐' },
  { path: '/reading', icon: FaBookOpen, text: '阅读' },
  { path: '/chat', icon: FaComments, text: '聊天' },
  { path: '/friends', icon: <PeopleAltIcon />, text: '好友' },
  { path: '/games', icon: FaGamepad, text: '游戏' }
];

function Sidebar({ isOpen, onToggle, user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  // 这是抽屉的内部内容，我们将它抽离出来以便复用
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* -- 头部用户信息 -- */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={600}>{user?.username || '用户'}</Typography>
          <Typography variant="body2" color="text.secondary">在线</Typography>
        </Box>
      </Box>
      <Divider />

      {/* -- 导航列表 -- */}
      <List sx={{ flexGrow: 1, p: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              selected={location.pathname === item.path} // 关键：高亮当前页面
              sx={{ borderRadius: 2, mb: 0.5 }}
              onClick={isMobile ? onToggle : undefined} // 关键：在手机上点击后自动关闭抽屉
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* -- 分隔线和设置按钮 -- */}
      <Divider />
      <List sx={{ p: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            component={NavLink}
            to="/settings"
            selected={location.pathname === '/settings'}
            sx={{ borderRadius: 2 }}
            onClick={isMobile ? onToggle : undefined}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><FaCog /></ListItemIcon>
            <ListItemText primary="设置" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="mailbox folders"
    >
      {isMobile ? (
        // --- 手机模式：临时抽屉 ---
        <Drawer
          variant="temporary"
          open={isOpen}
          onClose={onToggle}
          ModalProps={{ keepMounted: true }} // 更好的移动端性能
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        // --- 桌面模式：永久侧边栏 ---
        <Drawer
          variant="permanent"
          open
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              // 让背景也应用主题颜色
              bgcolor: 'background.default', 
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  );
}

export default Sidebar;
