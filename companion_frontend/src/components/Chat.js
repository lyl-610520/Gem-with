// src/components/Chat.js (最终重构版)

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, 
  TextField, IconButton, CircularProgress 
} from '@mui/material';
import { FaPaperPlane } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../stores/chatStore'; // 引入我们新的 Store

const GeminiAvatar = () => (
  <Avatar sx={{ bgcolor: 'secondary.main' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.5 12.5C19.5 13.0304 19.2893 13.5391 18.9142 13.9142C18.5391 14.2893 18.0304 14.5 17.5 14.5C16.9696 14.5 16.4609 14.2893 16.0858 13.9142C15.7107 13.5391 15.5 13.0304 15.5 12.5C15.5 11.9696 15.7107 11.4609 16.0858 11.0858C16.4609 10.7107 16.9696 10.5 17.5 10.5C18.0304 10.5 18.5391 10.7107 18.9142 11.0858C19.2893 11.4609 19.5 11.9696 19.5 12.5ZM8.5 12.5C8.5 13.0304 8.28929 13.5391 7.91421 13.9142C7.53914 14.2893 7.03043 14.5 6.5 14.5C5.96957 14.5 5.46086 14.2893 5.08579 13.9142C4.71071 13.5391 4.5 13.0304 4.5 12.5C4.5 11.9696 4.71071 11.4609 5.08579 11.0858C5.46086 10.7107 5.96957 10.5 6.5 10.5C7.03043 10.5 7.53914 10.7107 7.91421 11.0858C8.28929 11.4609 8.5 11.9696 8.5 12.5ZM12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" />
    </svg>
  </Avatar>
);

function Chat({ user }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // 从全局 Store 获取状态和 Actions
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
    <Box maxWidth="800px" mx="auto" p={2}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        💬 与Gemini聊天
      </Typography>

      <Paper 
        elevation={2} 
        sx={{ 
          height: '75vh', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box p={2} borderBottom="1px solid" borderColor="divider">
          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            Gemini 在线
          </Typography>
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ListItem sx={{ 
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  mb: 1,
                  px: 0,
                }}>
                  {msg.sender === 'gemini' && <ListItemAvatar><GeminiAvatar /></ListItemAvatar>}
                  <Box sx={{ 
                      bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                      borderRadius: 4,
                      p: 1.5,
                      maxWidth: '75%',
                      boxShadow: 1,
                  }}>
                    <ListItemText primary={msg.text} secondary={msg.time} secondaryTypographyProps={{ 
                        color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                        textAlign: 'right', 
                        mt: 0.5 
                    }}/>
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

        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="输入消息..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isTyping}
            InputProps={{
              endAdornment: (
                <IconButton type="submit" color="primary" disabled={isTyping || !inputValue.trim()}>
                  <FaPaperPlane />
                </IconButton>
              ),
              sx: { borderRadius: 4 }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}

export default Chat;
