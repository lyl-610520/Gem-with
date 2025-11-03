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
import useLudoStore from './stores/ludoStore';
import LudoInvitationPopup from './components/games/LudoInvitationPopup'; // 确保路径正确



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
  const { invitation, setInvitation, clearInvitation } = useLudoStore();
  // --- VVVV  请把下面这一整段 useEffect 添加进去 VVVV ---

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
// VVVVVV  请用下面这一整段代码，替换掉您现有的、负责创建 socket 的 useEffect VVVVVV

useEffect(() => {
  // 只有在用户登录后才进行所有 socket 相关操作
  if (user) {
    // 1. 创建 socket 连接实例
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const cleanApiUrl = apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
    const socketUrl = `${cleanApiUrl}/api`;
    const token = localStorage.getItem('token');
    
    console.log("正在尝试连接到WebSocket:", socketUrl);
    const newSocket = io(socketUrl, { query: { token } });

    // 2. [核心] 在 'connect' 事件触发后，才设置监听器并更新 state
      const handleNewMessage = (message) => {
        console.log('✅ WebSocket 收到新消息:', message);
        // 确保 user.id 是最新的
        useFriendChatStore.getState().addMessage(message, user.id);
      };

      newSocket.on('connect', () => {
        console.log(`✅ 成功连接到 ${socketUrl}！`);
        setSocket(newSocket);
        
        // [修改] 将监听器注册移到 connect 成功之后
        newSocket.on('receive_private_message', handleNewMessage);
      });

    const handleInvitation = (data) => {
        console.log('✅ 收到飞行棋邀请:', data);
        setInvitation(data); // 使用从 useLudoStore 获取的 action
      };
      
      const handleKicked = (data) => {
        alert("你已被房主移出飞行棋房间。");
        // 当被踢时，重置 ludo store 的状态
        useLudoStore.getState().reset();
      };
      
      // ^^^^^^ 添加结束 ^^^^^^

      newSocket.on('connect', () => {
        console.log(`✅ 成功连接到 ${socketUrl}！`);
        setSocket(newSocket);
        
        newSocket.on('receive_private_message', handleNewMessage);
        
        // VVVVVV 在 connect 成功后，绑定新的事件监听 VVVVVV
        
        newSocket.on('ludo:receive_invitation', handleInvitation);
        newSocket.on('ludo:you_were_kicked', handleKicked);
        
        // ^^^^^^ 绑定结束 ^^^^^^
      });

    // 3. (推荐) 添加其他生命周期事件的监听
    newSocket.on('disconnect', (reason) => {
      console.log(`❌ WebSocket 连接已断开: ${reason}`);
    });
    newSocket.on('connect_error', (err) => {
      console.error("WebSocket 连接错误:", err.message);
    });

    // 4. 定义清理函数
    return () => {
      console.log("正在断开 WebSocket 连接...");
      newSocket.off('receive_private_message', handleNewMessage); // <--- 关键！移除监听
      newSocket.off('ludo:receive_invitation', handleInvitation);
      newSocket.off('ludo:you_were_kicked', handleKicked);
      newSocket.disconnect();
      setSocket(null); // 登出或组件卸载时，清理 socket state
    };
  }
}, [user, setInvitation]); // 这个 effect 只依赖于 user 的登录/登出状态

// ^^^^^^ 替换到这里结束 ^^^^^^

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

  // --- [新增] 处理接受/拒绝邀请的函数 ---
  const handleAcceptInvite = (roomId) => {
    if (socket) {
      socket.emit('ludo:accept_invitation', { room_id: roomId });
      // 清空邀请弹窗
      clearInvitation();
      // 注意：这里我们不需要强制跳转页面。
      // 后端会在接受邀请后广播 'ludo:room_update' 事件，
      // 如果用户此时正好在 Games 页面，LudoGame 组件会监听到并自动进入房间。
      // 这是一个更解耦、更优雅的设计。
    }
  };

  const handleDeclineInvite = () => {
    clearInvitation();
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
                  <Route path="/reading/:bookId" element={<Reader user={user} socket={socket} />} />
                  <Route path="/games" element={<Games user={user} socket={socket} />} />
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
      {/* [新增] 渲染全局邀请弹窗 */}
      <LudoInvitationPopup 
        invitation={invitation}
        onAccept={handleAcceptInvite}
        onDecline={handleDeclineInvite}
      />
      <div id="youtube-iframe-placeholder" style={{ display: 'none' }}></div>
    </ThemeProvider>
  );
}

export default App;
