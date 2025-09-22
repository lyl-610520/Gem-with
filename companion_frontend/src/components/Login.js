import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getQQIdFromURL } from '../utils/syncData'; // 你的工具函数保持不变

// [核心改造] 从MUI导入我们需要的所有UI组件
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';

// [新增] 导入一个MUI图标，增加趣味性
import LockOpenIcon from '@mui/icons-material/LockOpen';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    qq_id: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 从URL获取QQ号 (逻辑保持不变)
  useEffect(() => {
    const qqId = getQQIdFromURL(window.location.href);
    if (qqId) {
      setFormData(prev => ({ ...prev, qq_id: qqId }));
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(endpoint, formData);
      setSuccess(`${isLogin ? '登录' : '注册'}成功！正在进入空间...`);
      // 延迟一点时间让用户看到成功信息，然后调用onLogin切换页面
      setTimeout(() => {
        onLogin(response.data);
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.error || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Container组件会自动处理居中和最大宽度，实现响应式
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Paper组件自带阴影和主题背景色，替代了原来的LoginCard */}
        <Paper 
          elevation={6} // 阴影深度
          sx={{ 
            p: 4, // p代表padding, 4代表 4 * 8px = 32px
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backdropFilter: 'blur(10px)', // 保留你的毛玻璃效果
            backgroundColor: (theme) => 
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            🌟 陪伴空间
          </Typography>
          <Typography component="p" variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {isLogin ? '欢迎回来，与Gemini一起度过美好时光' : '创建账户，开始你的陪伴之旅'}
          </Typography>

          {/* Alert组件比div好看得多 */}
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            {/* TextField是MUI的输入框，集成了Label、Input和各种样式 */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="qq_id"
              label="QQ号"
              name="qq_id"
              value={formData.qq_id}
              onChange={handleInputChange}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="username"
              label="用户名"
              id="username"
              value={formData.username}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密码"
              type="password"
              id="password"
              value={formData.password}
              onChange={handleInputChange}
            />
            
            {/* MUI的Button组件，自带加载中状态 */}
            <Button
              type="submit"
              fullWidth
              variant="contained" // "contained"是实心按钮样式
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }} // mt=marginTop, mb=marginBottom, py=padding-top/bottom
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOpenIcon />}
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
                <Link href="#" variant="body2" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
                  {isLogin ? '还没有账户？点击注册' : '已有账户？点击登录'}
                </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
