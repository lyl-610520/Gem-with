// src/components/Header.js (最终重构版)

import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Badge, Tooltip } from '@mui/material';
import { FaBars, FaSignOutAlt, FaBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function Header({ user, onLogout, onToggleSidebar }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 使用 MUI Dialog 会更优雅，但 confirm 也能工作
    if (window.confirm('确定要退出登录吗？')) {
      onLogout();
    }
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        // 关键：创建毛玻璃效果
        bgcolor: (theme) => `rgba(${theme.palette.mode === 'light' ? '255, 255, 255, 0.7' : '26, 26, 46, 0.7'})`,
        backdropFilter: 'blur(10px)',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
      }}
    >
      <Toolbar>
        {/* -- 左侧区域 -- */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ 
            mr: 2, 
            // 关键：只在平板及以下尺寸显示
            display: { md: 'none' } 
          }}
        >
          <FaBars />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          陪伴空间
        </Typography>

        {/* 一个弹性的空白，将右侧图标推到最右边 */}
        <Box sx={{ flexGrow: 1 }} />

        {/* -- 右侧区域 -- */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="通知">
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <FaBell />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.username || '用户'}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '1rem' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </Tooltip>
          
          <Tooltip title="退出登录">
            <IconButton color="inherit" onClick={handleLogout}>
              <FaSignOutAlt />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
