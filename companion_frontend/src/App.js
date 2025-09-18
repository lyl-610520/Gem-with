import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import axios from 'axios';

// 组件导入
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

// 主题配置
const themes = {
  pure: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    text: '#1f2937',
    textLight: '#6b7280',
    border: 'rgba(255, 255, 255, 0.2)',
    shadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  cute: {
    primary: '#ff6b9d',
    secondary: '#ffa726',
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
    cardBg: 'rgba(255, 255, 255, 0.9)',
    text: '#2d3748',
    textLight: '#718096',
    border: 'rgba(255, 255, 255, 0.3)',
    shadow: '0 15px 35px rgba(255, 107, 157, 0.2)',
    borderRadius: '20px',
    fontFamily: '"Comic Sans MS", cursive, sans-serif'
  },
  dreamy: {
    primary: '#8b5cf6',
    secondary: '#06b6d4',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    cardBg: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textLight: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(255, 255, 255, 0.2)',
    shadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    borderRadius: '16px',
    fontFamily: '"Georgia", serif'
  }
};

// 全局样式
const GlobalStyle = createGlobalStyle`
  body {
    font-family: ${props => props.theme.fontFamily};
    background: ${props => props.theme.background};
    color: ${props => props.theme.text};
    transition: all 0.3s ease;
  }
  
  * {
    box-sizing: border-box;
  }
`;

// 主容器
const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${props => props.theme.background};
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: ${props => props.sidebarOpen ? '250px' : '0'};
  transition: margin-left 0.3s ease;
  
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

// API配置
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('pure');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // 检查用户登录状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/user/profile');
      setUser(response.data);
      setTheme(response.data.theme || 'pure');
      setCustomColor(response.data.custom_color || '#6366f1');
    } catch (error) {
      console.log('用户未登录');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData.user);
    setTheme(userData.user.theme || 'pure');
    setCustomColor(userData.user.custom_color || '#6366f1');
  };

  const handleLogout = () => {
    setUser(null);
    setTheme('pure');
    setCustomColor('#6366f1');
  };

  const handleThemeChange = (newTheme, newColor = null) => {
    setTheme(newTheme);
    if (newColor) {
      setCustomColor(newColor);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 创建当前主题
  const currentTheme = {
    ...themes[theme],
    primary: theme === 'pure' ? customColor : themes[theme].primary
  };

  if (loading) {
    return (
      <ThemeProvider theme={currentTheme}>
        <GlobalStyle />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: currentTheme.background
        }}>
          <div className="pulse" style={{ 
            fontSize: '24px', 
            color: currentTheme.text,
            textAlign: 'center'
          }}>
            🌟 正在加载陪伴空间...
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={currentTheme}>
        <GlobalStyle />
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyle />
      <Router>
        <AppContainer>
          <Sidebar 
            isOpen={sidebarOpen} 
            onToggle={toggleSidebar}
            user={user}
          />
          <MainContent sidebarOpen={sidebarOpen}>
            <Header 
              user={user} 
              onLogout={handleLogout}
              onToggleSidebar={toggleSidebar}
            />
            <ContentArea>
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
                      theme={theme}
                      customColor={customColor}
                      onThemeChange={handleThemeChange}
                    />
                  } 
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ContentArea>
          </MainContent>
        </AppContainer>
      </Router>
    </ThemeProvider>
  );
}

export default App;