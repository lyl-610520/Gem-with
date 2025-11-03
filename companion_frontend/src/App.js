import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from "socket.io-client";
import { createTheme, ThemeProvider, Box, CircularProgress } from '@mui/material';

// 组件导入
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

// 全局 Store 和组件
import useFriendChatStore from './stores/friendChatStore';
import useLudoStore from './stores/ludoStore';
import LudoInvitationPopup from './components/games/LudoInvitationPopup';

// 主题创建逻辑 (保持不变)
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
  },
  shape: { borderRadius: mode === 'cute' ? 20 : 12 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', transition: 'all 0.3s ease' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 'bold' } } },
  },
});


// ==========================================================
// AppContent: 路由和核心UI渲染层
// (将需要使用 React Router hooks 的逻辑都放在这里)
// ==========================================================
const AppContent = ({ user, socket, handleLogin, handleLogout, sidebarOpen, toggleSidebar, themeName, customColor, onThemeChange }) => {
  const navigate = useNavigate();

  // 从 Ludo Store 获取状态和 actions
  const { invitation, setInvitation, clearInvitation, updateRoom } = useLudoStore();

  // --- 统一的 WebSocket 事件监听器 ---
  useEffect(() => {
    if (user && socket) {
      // --- 好友聊天事件 ---
      const handleNewMessage = (message) => {
        console.log('✅ WebSocket 收到新消息:', message);
        useFriendChatStore.getState().addMessage(message, user.id);
      };

      // --- 飞行棋游戏事件 ---
      const handleInvitation = (data) => {
        console.log('✅ 收到飞行棋邀请:', data);
        setInvitation(data);
      };
      
      const handleKicked = () => {
        alert("你已被房主移出飞行棋房间。");
        useLudoStore.getState().reset();
        navigate('/games'); // 被踢后跳转回游戏主页
      };
      
      const handleJoinSuccess = (roomData) => {
        console.log('✅ 成功加入房间，正在跳转...');
        updateRoom(roomData);
        clearInvitation();
        navigate('/games'); // 执行页面跳转！
      };

      // 绑定所有事件
      socket.on('receive_private_message', handleNewMessage);
      socket.on('ludo:receive_invitation', handleInvitation);
      socket.on('ludo:you_were_kicked', handleKicked);
      socket.on('ludo:join_success', handleJoinSuccess);

      // 清理函数
      return () => {
        socket.off('receive_private_message', handleNewMessage);
        socket.off('ludo:receive_invitation', handleInvitation);
        socket.off('ludo:you_were_kicked', handleKicked);
        socket.off('ludo:join_success', handleJoinSuccess);
      };
    }
  }, [user, socket, navigate, setInvitation, clearInvitation, updateRoom]);

  // --- 游戏邀请处理函数 ---
  const handleAcceptInvite = (roomId) => {
    if (socket) {
      socket.emit('ludo:accept_invitation', { room_id: roomId });
      // 不再需要手动操作，监听器会处理后续逻辑
    }
  };

  const handleDeclineInvite = () => {
    clearInvitation();
  };

  return (
    <>
      {/* 认证路由 */}
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <>
          {/* 主应用UI */}
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} user={user} />
          <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, pb: '100px', ml: { sm: sidebarOpen ? '250px' : 0 }, transition: (theme) => theme.transitions.create('margin', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }), minWidth: 0, }}>
            <Header user={user} onLogout={handleLogout} onToggleSidebar={toggleSidebar} />
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/diary" element={<Diary user={user} />} />
              <Route path="/checkin" element={<Checkin user={user} />} />
              <Route path="/music" element={<Music user={user} />} /> 
              <Route path="/reading" element={<Reading user={user} />} />
              <Route path="/reading/:bookId" element={<Reader user={user} socket={socket} />} />
              <Route path="/games" element={<Games user={user} socket={socket} />} />
              <Route path="/friends" element={<FriendsPage user={user} socket={socket} />} />
              <Route path="/chat" element={<Chat user={user} />} />
              <Route path="/settings" element={<Settings user={user} theme={themeName} customColor={customColor} onThemeChange={onThemeChange} />} />
              <Route path="/login" element={<Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Box>
          <GlobalPlayer /> 
        </>
      )}

      {/* 全局邀请弹窗 */}
      <LudoInvitationPopup 
        invitation={invitation}
        onAccept={handleAcceptInvite}
        onDecline={handleDeclineInvite}
      />
    </>
  );
};


// ==========================================================
// App: 顶层容器，负责状态管理和Provider
// ==========================================================
function App() {
  const [user, setUser] = useState(null);
  const [themeName, setThemeName] = useState('pure');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

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

  // --- 用户认证检查 Effect ---
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

  // --- WebSocket 连接管理 Effect ---
  useEffect(() => {
    if (user) {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const cleanApiUrl = apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
      const socketUrl = `${cleanApiUrl}/api`;
      const token = localStorage.getItem('token');
      
      console.log("正在尝试连接到WebSocket:", socketUrl);
      const newSocket = io(socketUrl, { query: { token } });

      newSocket.on('connect', () => {
        console.log(`✅ 成功连接到 ${socketUrl}！`);
        setSocket(newSocket);
      });

      newSocket.on('disconnect', (reason) => {
        console.log(`❌ WebSocket 连接已断开: ${reason}`);
        setSocket(null);
      });

      newSocket.on('connect_error', (err) => {
        console.error("WebSocket 连接错误:", err.message);
      });

      return () => {
        console.log("正在断开 WebSocket 连接...");
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [user]);

  // --- 处理器函数 ---
  const handleLogin = (loginResponseData) => {
    if (loginResponseData && loginResponseData.user) {
        updateUserState(loginResponseData.user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    updateUserState(null);
  };
  
  const handleThemeChange = (newTheme, newColor = null) => {
    setThemeName(newTheme);
    if (newColor) { setCustomColor(newColor); }
  };

  const toggleSidebar = () => { setSidebarOpen(!sidebarOpen); };
  
  // --- 主题和加载状态 ---
  const theme = useMemo(() => getTheme(themeName, customColor), [themeName, customColor]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
          <Box component="span" sx={{ ml: 2 }}>正在加载陪伴空间...</Box>
        </Box>
      </ThemeProvider>
    );
  }

  // --- 最终渲染 ---
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Router>
          <AppContent
            user={user}
            socket={socket}
            handleLogin={handleLogin}
            handleLogout={handleLogout}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            themeName={themeName}
            customColor={customColor}
            onThemeChange={handleThemeChange}
          />
        </Router>
      </Box>
      <div id="youtube-iframe-placeholder" style={{ display: 'none' }}></div>
    </ThemeProvider>
  );
}

export default App;
