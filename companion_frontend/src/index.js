import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import axios from 'axios';

// [新增] 引入MUI的基础CSS，用于重置浏览器默认样式，确保兼容性
import CssBaseline from '@mui/material/CssBaseline';

// [新增] 引入Google字体，为我们的主题做准备
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/noto-sans-sc/300.css'; // 可爱/纯色主题中文字体
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/zcool-kuaile/400.css'; // 可爱主题艺术字体
import '@fontsource/long-cang/400.css';     // 梦幻主题手写字体


// API配置 (保持不变)
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* [新增] CssBaseline组件是MUI的全局样式重置，让所有浏览器表现一致 */}
    <CssBaseline />
    <App />
  </React.StrictMode>
);
