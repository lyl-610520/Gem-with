// src/App.js (最终加固版)

import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import { createTheme, ThemeProvider, Box, CircularProgress } from '@mui/material';

// 组件导入 (保持不变)
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Diary from './components/Diary';
import Checkin from './components/Checkin';
import Music from './components/Music';
import Reading from './components/Reading';
import Reader from './components/Reader';
import Games from './components/Games';
import Chat from './components/Chat';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import GlobalPlayer from './components/GlobalPlayer';

// 您的主题创建逻辑 (保持不变)
const getTheme = (mode, customColor) => createTheme({ /* ... 你的主题代码 ... */ });

function App() {
  const [user, setUser] = useState(null);
  const [themeName, setThemeName] = useState('pure');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // VVVV [核心加固区域] VVVV
  // 我们将更新 user 状态的逻辑封装成一个函数，确保每次更新都是完整的
  const updateUserState = (userData) => {
    if (userData) {
      setUser(userData); // 直接使用后端返回的完整对象
      setThemeName(userData.theme || 'pure');
      setCustomColor(userData.custom_color || '#6366f1');
    } else {
      setUser(null);
      setThemeName('pure');
      setCustomColor('#6366f1');
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // axios 拦截器会自动添加 token
          // 请求我们修改过的 /user/profile 接口
          const response = await axios.get('/user/profile');
          // 使用新的函数来更新状态，确保 is_spotify_linked 等字段被正确设置
          updateUserState(response.data); 
        } catch (error) {
          console.error("Token 无效或已过期, 正在登出.", error);
          localStorage.removeItem('token');
          updateUserState(null);
        }
      }
      setLoading(false);
    };
    checkAuthStatus();
  }, []);

  const handleLogin = (loginResponseData) => {
    // 登录成功后，后端通常会返回 user 对象和 token
    // 我们直接使用这个 user 对象来更新状态
    if (loginResponseData && loginResponseData.user) {
        updateUserState(loginResponseData.user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    updateUserState(null);
  };
  // ^^^^ [核心加固结束] ^^^^
  
  const handleThemeChange = (newTheme, newColor = null) => {
    setThemeName(newTheme);
    if (newColor) {
      setCustomColor(newColor);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const theme = useMemo(() => getTheme(themeName, customColor), [themeName, customColor]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'background.default', color: 'text.primary' }}>
          <CircularProgress color="primary" />
          <Box component="span" sx={{ ml: 2, fontSize: '1.2rem' }}>正在加载陪伴空间...</Box>
        </Box>
      </ThemeProvider>
    );
  }

  // 路由和渲染逻辑 (保持不变, 但现在 user 对象是安全的)
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Router>
          {/* VVVV 这里的 !user 判断现在是完全可靠的 VVVV */}
          {!user ? (
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          ) : (
            <>
              <Sidebar 
                isOpen={sidebarOpen} 
                onToggle={toggleSidebar}
                user={user}
              />
              <Box 
                component="main" 
                sx={{
                  flexGrow: 1,
                  p: 3, 
                  pb: '100px', 
                  ml: { sm: sidebarOpen ? `250px` : 0 },
                  transition: (theme) => theme.transitions.create('margin', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
                }}
              >
                <Header 
                  user={user} 
                  onLogout={handleLogout}
                  onToggleSidebar={toggleSidebar}
                />
                <Routes>
                  {/* 现在传递给所有组件的 user 对象都是包含了 is_spotify_linked 的完整对象 */}
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/diary" element={<Diary user={user} />} />
                  <Route path="/checkin" element={<Checkin user={user} />} />
                  <Route path="/music" element={<Music user={user} />} /> 
                  <Route path="/reading" element={<Reading user={user} />} />
                  <Route path="/reading/:bookId" element={<Reader user={user} />} />
                  <Route path="/games" element={<Games user={user} />} />
                  <Route path="/chat" element={<Chat user={user} />} />
                  <Route 
                    path="/settings" 
                    element={
                      <Settings 
                        user={user} 
                        theme={themeName}
                        customColor={customColor}
                        onThemeChange={handleThemeChange}
                      />
                    } 
                  />
                  <Route path="/login" element={<Navigate to="/" />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Box>
              <GlobalPlayer /> 
            </>
          )}
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
