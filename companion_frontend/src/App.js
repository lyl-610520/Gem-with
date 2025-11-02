// src/App.js (最终加固版)

import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { io } from "socket.io-client";
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
import FriendsPage from './components/friends/FriendsPage';
import useFriendChatStore from './stores/friendChatStore'; // 确保路径正确



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
  const [socket, setSocket] = useState(null);
  // --- VVVV  请把下面这一整段 useEffect 添加进去 VVVV ---
  useEffect(() => {
    // 如果 socket 还没有连接好，就什么都不做
    if (!socket || !user) return; // <-- 加上 !user 的判断更安全

    // 定义一个处理函数，用来接收消息
    const handleNewMessage = (message) => {
      console.log('✅ WebSocket 收到新消息:', message);
      // 调用 store 的 action，把新消息添加到“仓库”里
      // 我们用 getState().addMessage 是因为它是在回调函数中，非React组件渲染周期内
      useFriendChatStore.getState().addMessage(message, user.id); 
    };

    // 开始监听 'receive_private_message' 事件
    socket.on('receive_private_message', handleNewMessage);

    // 【重要】组件卸载时，一定要取消监听，防止内存泄漏！
    return () => {
      socket.off('receive_private_message', handleNewMessage);
    };

  }, [socket, user]); // 这个 effect 仅在 socket 实例变化时重新运行
  // --- ^^^^ 添加结束 ^^^^

  // VVVV [核心加固区域] VVVV
  // VVVV [核心修正 1/3]: 在这里定义 socket 状态 VVVV
  

  const updateUserState = (userData) => {
    if (userData) {
      setUser(userData);
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
          const response = await axios.get('/user/profile');
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

  // VVVV [核心修正 2/3]: 将所有 WebSocket 逻辑都包裹在一个新的 useEffect 中 VVVV
  useEffect(() => {
    // 只有在用户登录后 (user 对象存在时) 才建立 WebSocket 连接
    if (user && !socket) {
      const token = localStorage.getItem('token');
      if (token) {
         // 1. 获取基础URL
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        
        // 2. [核心修复] 移除可能存在的尾部斜杠或/api
        const cleanApiUrl = apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
        
        // 3. 构建最终的、绝对正确的socket连接URL
        const socketUrl = `${cleanApiUrl}/api`;

        console.log("正在尝试连接到WebSocket:", socketUrl); // <-- 添加一条日志用于调试

        const newSocket = io(socketUrl, { 
          query: { token }
        });

        newSocket.on('connect', () => {
          console.log(`✅ 成功连接到 ${socketUrl}！`);
        });

        newSocket.on('disconnect', (reason) => {
          console.log(`❌ WebSocket 连接已断开: ${reason}`);
        });

        newSocket.on('connect_error', (err) => {
           console.error("WebSocket 连接错误:", err.message);
        });

        setSocket(newSocket);
        
        // ^^^^ 替换结束 ^^^^
      }
    } else if (!user && socket) {
      // 如果用户登出，则断开连接
      socket.disconnect();
      setSocket(null);
    }
    
    // VVVV [核心修正 3/3]: useEffect 的清理函数 VVVV
    // 这个函数会在组件卸载时，或者在下一次 useEffect 运行前执行
    return () => {
      // 如果 socket 存在，确保在组件卸载时断开它
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, socket]); // 这个 useEffect 依赖于 user 和 socket 状态

  const handleLogin = (loginResponseData) => {
    if (loginResponseData && loginResponseData.user) {
        updateUserState(loginResponseData.user);
    }
  };

  const handleLogout = () => {
    // 登出时，user 状态会变为 null，上面的 useEffect 会自动处理 socket 断开
    localStorage.removeItem('token');
    updateUserState(null);
  };
  
  const handleThemeChange = (newTheme, newColor = null) => {
    setThemeName(newTheme);
    if (newColor) { setCustomColor(newColor); }
  };

  const toggleSidebar = () => { setSidebarOpen(!sidebarOpen); };
  
  const theme = useMemo(() => getTheme(themeName, customColor), [themeName, customColor]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress color="primary" />
          <Box component="span" sx={{ ml: 2 }}>正在加载陪伴空间...</Box>
        </Box>
      </ThemeProvider>
    );
  }

  // 路由和渲染逻辑 (保持不变, 但现在 user 对象是安全的)
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        backgroundColor: 'background.default',
      }}>
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
                  p: { xs: 2, sm: 3 },
                  pb: '100px', 
                  ml: { sm: sidebarOpen ? `250px` : 0 },
                  transition: (theme) => theme.transitions.create('margin', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
                  minWidth: 0,
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
                  <Route path="/friends" element={<FriendsPage user={user} socket={socket} />} />
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
      <div id="youtube-iframe-placeholder" style={{ display: 'none' }}></div>
    </ThemeProvider>
  );
}

export default App;
