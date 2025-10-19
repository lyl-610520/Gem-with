// src/App.js (布局修正版)

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
import GlobalPlayer from './components/GlobalPlayer'; // 播放器组件

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

  // 认证逻辑 (保持不变)
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/profile`);
          setUser(response.data);
          setThemeName(response.data.theme || 'pure');
          setCustomColor(response.data.custom_color || '#6366f1');
        } catch (error) {
          console.error("Token is invalid, logging out.", error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuthStatus();
  }, []);

  const handleLogin = (userData) => {
    if (userData && userData.user) {
        setUser(userData.user);
        setThemeName(userData.user.theme || 'pure');
        setCustomColor(userData.user.custom_color || '#6366f1');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setThemeName('pure');
    setCustomColor('#6366f1');
  };
  
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

  // 加载动画 (保持不变)
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

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Router>
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
              {/* VVVV [核心修改] VVVV */}
              <Box 
                component="main" 
                sx={{
                  flexGrow: 1,
                  p: 3, 
                  // [修改1] 增加一个足够大的 padding-bottom，为播放器留出“安全区”
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
                {/* [修改2] GlobalPlayer 从这里被移除了！ */}
              </Box>

              {/* [修改3] GlobalPlayer 现在是 main Box 的“兄弟”，直接放在这里 */}
              {/* 这样它的 position:fixed 就会相对于整个窗口，而不是被内容区限制 */}
              {user && <GlobalPlayer />} 
              {/* ^^^^ [核心修改结束] ^^^^ */}
            </>
          )}
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
