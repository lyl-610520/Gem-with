import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getQQIdFromURL, shouldSyncData, markDataSynced } from '../utils/syncData';

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 20px;
`;

const LoginCard = styled.div`
  background: ${props => props.theme.cardBg};
  padding: 40px;
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: ${props => props.theme.shadow};
  width: 100%;
  max-width: 400px;
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.theme.border};
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
  color: ${props => props.theme.text};
  font-size: 2rem;
  font-weight: 600;
`;

const Subtitle = styled.p`
  text-align: center;
  margin-bottom: 30px;
  color: ${props => props.theme.textLight};
  font-size: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: ${props => props.theme.text};
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: ${props => props.theme.text};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  &::placeholder {
    color: ${props => props.theme.textLight};
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.primary};
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
  margin-top: 10px;
  
  &:hover {
    color: ${props => props.theme.secondary};
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  border: 1px solid rgba(34, 197, 94, 0.2);
`;

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

  // 从URL获取QQ号
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
      if (isLogin) {
        const response = await axios.post('/api/auth/login', formData);
        onLogin(response.data);
        setSuccess('登录成功！');
      } else {
        const response = await axios.post('/api/auth/register', formData);
        onLogin(response.data);
        setSuccess('注册成功！');
      }
    } catch (error) {
      setError(error.response?.data?.error || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>🌟 陪伴空间</Title>
        <Subtitle>
          {isLogin ? '欢迎回来，与Gemini一起度过美好时光' : '创建账户，开始你的陪伴之旅'}
        </Subtitle>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>QQ号</Label>
            <Input
              type="text"
              name="qq_id"
              value={formData.qq_id}
              onChange={handleInputChange}
              placeholder="请输入你的QQ号"
              required
            />
          </InputGroup>
          
          <InputGroup>
            <Label>用户名</Label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="请输入用户名"
              required
            />
          </InputGroup>
          
          <InputGroup>
            <Label>密码</Label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="请输入密码"
              required
            />
          </InputGroup>
          
          <Button type="submit" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </Button>
          
          <ToggleButton type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '还没有账户？点击注册' : '已有账户？点击登录'}
          </ToggleButton>
        </Form>
      </LoginCard>
    </LoginContainer>
  );
}

export default Login;
