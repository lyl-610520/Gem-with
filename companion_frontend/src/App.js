import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// [新增] 从MUI导入核心组件和主题创建工具
import { createTheme, ThemeProvider, Box, CircularProgress } from '@mui/material';

// 组件导入 (保持不变)
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Diary from './components/Diary';
import Checkin from './components/Checkin';
import Music from './components/Music';
import Reading from './components/Reading';
import Games from './components/Games';
import Chat from './components/Chat';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// [核心改造] 使用MUI的 createTheme 来定义主题
const getTheme = (mode, customColor) => createTheme({
  palette: {
    // mode可以是 'light' 或 'dark'，我们这里先统一用 'light'，用背景来区分
    mode: 'light', 
    primary: {
      main: customColor || '#6366f1', // 默认主色
    },
    secondary: {
      main: mode === 'cute' ? '#ffa726' : (mode === 'dreamy' ? '#06b6d4' : '#8b5cf6'),
    },
    background: {
      default: 
        mode === 'pure' ? '#f3f4f6' : // 纯色主题用一个非常柔和的淡灰色背景
        mode === 'cute' ? '#fff0f5' : // 可爱主题用淡粉色
        '#1a1a2e', // 梦幻主题用深蓝色
      paper: 
        mode === 'pure' ? '#ffffff' :
        mode === 'cute' ? '#ffffff' :
        'rgba(255, 255, 255, 0.08)', // 梦幻主题的卡片是半透明的
    },
    text: {
      primary: 
        mode === 'dreamy' ? '#ffffff' : '#1f2937', // 梦幻主题用白色文字
      secondary:
        mode === 'dreamy' ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
    },
  },
  typography: {
    fontFamily: 
      mode === 'pure' ? '"Noto Sans SC", "Roboto", sans-serif' :
      mode === 'cute' ? '"ZCOOL KuaiLe", "Noto Sans SC", cursive' :
      '"Long Cang", "Noto Sans SC", cursive',
    h1: { fontFamily: mode === 'cute' ? '"ZCOOL KuaiLe", cursive' : undefined },
    h2: { fontFamily: mode === 'cute' ? '"ZCOOL KuaiLe", cursive' : undefined },
    h3: { fontFamily: mode === 'cute' ? '"ZCOOL KuaiLe", cursive' : undefined },
  },
  shape: {
    borderRadius: mode === 'cute' ? 20 : 12, // 可爱主题用更圆的圆角
  },
  // 组件的默认样式覆盖
  components: {
    MuiPaper: { // 比如所有卡片、纸张元素
      styleOverrides: {
        root: {
          backgroundImage: 'none', // 确保背景色生效
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // 按钮文字不大写
          fontWeight: 'bold',
        },
      },
    },
  },
});

// [改造] 移除 styled-components 的 AppContainer, MainContent 等，用MUI的Box代替
// [改造] 全局样式也不再需要，MUI的 CssBaseline 和 ThemeProvider 会处理

function App() {
  const [user, setUser] = useState(null);
  const [themeName, setThemeName] = useState('pure'); // 主题名: pure, cute, dreamy
  const [customColor, setCustomColor] = useState('#6366f1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/user/profile');
      setUser(response.data);
      setThemeName(response.data.theme || 'pure');
      setCustomColor(response.data.custom_color || '#6366f1');
    } catch (error) {
      console.log('用户未登录');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData.user);
    setThemeName(userData.user.theme || 'pure');
    setCustomColor(userData.user.custom_color || '#6366f1');
  };

  const handleLogout = () => {
    setUser(null);
    setThemeName('pure');
    setCustomColor('#6366f1');
  };
  
  // 传入的是主题名字
  const handleThemeChange = (newTheme, newColor = null) => {
    setThemeName(newTheme);
    if (newColor) {
      setCustomColor(newColor);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // 使用 useMemo 防止每次渲染都重新创建主题对象，优化性能
  const theme = useMemo(() => getTheme(themeName, customColor), [themeName, customColor]);

  // 加载界面
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

  return (
    <ThemeProvider theme={theme}>
      {/* Box是MUI的万能容器，类似div，但可以直接使用主题系统里的样式 */}
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Router>
          {!user ? (
            // 如果未登录，只渲染登录页
            <Login onLogin={handleLogin} />
          ) : (
            // 如果已登录，渲染主界面
            <>
              <Sidebar 
                isOpen={sidebarOpen} 
                onToggle={toggleSidebar}
                user={user}
              />
              <Box component="main" sx={{
                flexGrow: 1,
                // p是padding的缩写，theme.spacing(3) = 8px * 3 = 24px
                p: 3, 
                // 侧边栏的响应式布局
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
                 {/* 内容区域 */}
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/diary" element={<Diary user={user} />} />
                  <Route path="/checkin" element={<Checkin user={user} />} />
                  <Route path="/music" element={<Music user={user} />} />
                  <Route path="/reading" element={<Reading user={user} />} />
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
