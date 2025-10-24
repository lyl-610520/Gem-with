// src/components/Chat.js (惊艳改造版)

import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, TextField, IconButton, CircularProgress } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { FaPaperPlane } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../stores/chatStore';

// 1. 新的、可爱的头像
const GeminiAvatar = () => (
  <Avatar 
    src="https://i.ibb.co/bFv3z04/gemini-avatar.png" // 我为您准备了一个更搭的头像
    sx={{ width: 40, height: 40, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
  />
);

// 2. 带有“小尾巴”的消息气泡
const MessageBubble = styled(Box)(({ theme, sender }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(1.25, 2), // 调整了内边距
  maxWidth: '100%', // 宽度由父级控制
  borderRadius: sender === 'user' 
    ? '20px 20px 5px 20px' 
    : '20px 20px 20px 5px',
  backgroundColor: sender === 'user' 
    ? theme.palette.primary.main 
    : theme.palette.background.paper,
  color: sender === 'user' 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}));

// 3. 带有呼吸感的背景动画
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

function Chat({ user }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const { messages, isTyping, initializeChat, sendMessage } = useChatStore();

  useEffect(() => {
    if (user) initializeChat(user.nickname);
  }, [user, initializeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box maxWidth="800px" mx="auto" p={{ xs: 1, sm: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        💬 与Gemini聊天
      </Typography>

      <Paper 
        elevation={0} 
        sx={{ 
          height: '75vh', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 4,
          overflow: 'hidden', // 隐藏内部溢出
          border: '1px solid rgba(0, 0, 0, 0.08)',
          // 4. “惊艳”的背景
          background: `linear-gradient(-45deg, #fce4ec, #e3f2fd, #e8eaf6, #f3e5f5)`,
          backgroundSize: '400% 400%',
          animation: `${gradientAnimation} 15s ease infinite`,
        }}
      >
        <Box p={2} sx={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}>
          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            Gemini 在线
          </Typography>
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1.5, sm: 3 } }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                // 5. 更具弹性的动画
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <ListItem sx={{ 
                  display: 'flex',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  gap: 1.5,
                  alignItems: 'flex-end', // 头像和气泡底部对齐
                  mb: 2,
                  px: 0,
                }}>
                  <ListItemAvatar sx={{ minWidth: 'auto' }}>
                    {msg.sender === 'gemini' && <GeminiAvatar />}
                  </ListItemAvatar>
                  <Box maxWidth="75%">
                    <MessageBubble sender={msg.sender}>
                        <ListItemText primary={msg.text} primaryTypographyProps={{ style: { whiteSpace: 'pre-wrap' } }} />
                        {/* 3. 整合的时间戳 */}
                        <Typography
                            variant="caption"
                            sx={{
                                color: msg.sender === 'user' ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                alignSelf: 'flex-end',
                                mt: 0.5,
                            }}
                        >
                            {msg.time}
                        </Typography>
                    </MessageBubble>
                  </Box>
                </ListItem>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
             <ListItem sx={{ px: 0 }}>
                <ListItemAvatar><GeminiAvatar /></ListItemAvatar>
                <CircularProgress size={24} />
             </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>

        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 2, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="输入消息..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isTyping}
            multiline
            maxRows={4}
            InputProps={{
              endAdornment: (
                <IconButton type="submit" color="primary" disabled={isTyping || !inputValue.trim()}>
                  <FaPaperPlane />
                </IconButton>
              ),
              sx: { borderRadius: 4, bgcolor: 'background.paper' }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}

export default Chat;
