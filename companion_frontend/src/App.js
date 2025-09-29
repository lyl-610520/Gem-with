// src/App.js (最终修复版 - 为您的项目量身定制)

import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import { createTheme, ThemeProvider, Box, CircularProgress } from '@mui/material';

// 组件导入 (您的组件，保持不变)
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

// 您的主题创建逻辑 (保持不变)
const getTheme = (mode, customColor) => createTheme({
  palette: {
    mode: 'light', 
    primary: { main: customColor || '#6366f1' },
    secondary: { main: mode === 'cute' ? '#ffa726' : (mode === 'dreamy' ? '#06b6d4' : '#8b5cf6') },
    background: {
      default: mode === 'pure' ? '#f3f4f6' : mode === 'cute' ? '#fff0f5' : '#1a1a2e',
      paper: mode === 'pure' ? '#ffffff' : mode === 'cute' ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: mode === 'dreamy' ? '#ffffff' : '#1f2937',
      secondary: mode === 'dreamy' ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
    },
  },
  typography: {
    fontFamily: mode === 'pure' ? '"Noto Sans SC", "Roboto", sans-serif' : mode === 'cute' ? '"ZCOOL KuaiLe", "Noto Sans SC", cursive' : '"Long Cang", "Noto Sans SC", cursive',
    h1: { fontFamily: mode === 'cute' ? '"ZCOOL KuaiLe", cursive' : undefined },
    h2: { fontFamily: mode === 'cute' ? '"ZCOOL KuaiLe", cursive' : undefined },
    h3: { fontFamily: mode === 'cute' ? '"ZCOOL KuaiLe", cursive' : undefined },
  },
  shape: { borderRadius: mode === 'cute' ? 20 : 12 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', transition: 'all 0.3s ease' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 'bold' } } },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [themeName, setThemeName] = useState('pure');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // --- VVVV  [核心修复] 从这里开始修改认证逻辑 VVVV ---

  useEffect(() => {
    // 这个函数现在是认证流程的唯一入口
    const checkAuthStatus = async () => {
      // 1. 先从浏览器的小仓库里找令牌
      const token = localStorage.getItem('token');

      if (token) {
        // 2. 如果找到了令牌，就去后端验证它
        try {
          // axios 拦截器会自动把 token 加到请求头里
          const response = await axios.get('/user/profile');
          // 3. 验证成功，我们拿到了用户信息
          setUser(response.data);
          setThemeName(response.data.theme || 'pure');
          setCustomColor(response.data.custom_color || '#6366f1');
        } catch (error) {
          // 4. 令牌无效或过期，清理掉它
          console.error("Token is invalid, logging out.", error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      
      // 5. 无论有没有令牌，检查都结束了，停止加载动画
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []); // 空数组 [] 确保这个检查只在应用启动时运行一次

  const handleLogin = (userData) => {
    // Login.js 已经把 token 存好了，我们只需要更新 App 的状态
    // 这个函数现在变得非常简单
    if (userData && userData.user) {
        setUser(userData.user);
        setThemeName(userData.user.theme || 'pure');
        setCustomColor(userData.user.custom_color || '#6366f1');
    }
  };

  const handleLogout = () => {
    // 登出时，只需要清理令牌和状态
    localStorage.removeItem('token');
    setUser(null);
    setThemeName('pure');
    setCustomColor('#6366f1');
  };
  
  // --- ^^^^ [核心修复] 认证逻辑修改结束 ^^^^ ---

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
        <Box sx={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
          backgroundColor: 'background.default', color: 'text.primary'
        }}>
          <CircularProgress color="primary" />
          <Box component="span" sx={{ ml: 2, fontSize: '1.2rem' }}>正在加载陪伴空间...</Box>
        </Box>
      </ThemeProvider>
    );
  }

  // 您的路由和渲染逻辑 (保持不变)
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Router>
          {!user ? (
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              {/* [新增] 如果未登录时访问任何其他页面，都强制跳回登录页 */}
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          ) : (
            <>
              <Sidebar 
                isOpen={sidebarOpen} 
                onToggle={toggleSidebar}
                user={user}
              />
              <Box component="main" sx={{
                flexGrow: 1,
                p: 3, 
                ml: { sm: sidebarOpen ? `250px` : 0 },
                transition: (theme) => theme.transitions.create('margin', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              }}>
                <Header 
                  user={user} 
                  onLogout={handleLogout}
                  onToggleSidebar={toggleSidebar}
                />
                <Routes>
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
                  {/* [修改] 登录后，访问 /login 就跳回主页 */}
                  <Route path="/login" element={<Navigate to="/" />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Box>
            </>
          )}
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
