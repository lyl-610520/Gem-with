// src/components/music/MusicChatView.js

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, List, ListItem, ListItemText, TextField, IconButton, 
  Typography, CircularProgress, Avatar, Paper 
} from '@mui/material';
import { FaPaperPlane, FaMusic } from 'react-icons/fa';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

import usePlayerStore from '../../stores/playerStore'; // 引入我们的全局播放器状态

// 聊天消息气泡的样式
const messageBubble = (isUser) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: isUser ? 'flex-end' : 'flex-start',
  mb: 1,
});

const messageText = (isUser) => ({
  p: 1.5,
  borderRadius: 4,
  bgcolor: isUser ? 'primary.main' : 'background.default',
  color: isUser ? 'primary.contrastText' : 'text.primary',
  maxWidth: '80%',
  wordWrap: 'break-word',
});


function MusicChatView({ user }) {
  const [messages, setMessages] = useState([
    { sender: 'gemini', text: `想聊点什么音乐吗？` }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 从 Zustand store 中获取音乐上下文
  const { isActive, trackInfo, source } = usePlayerStore(state => ({
    isActive: state.isActive,
    trackInfo: state.trackInfo,
    source: state.source,
  }));

  // 每次消息更新时，自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: newMessage };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    // 准备要发送给后端的数据
    const payload = {
      message: newMessage,
      context: {
        // 只在有音乐播放时才发送音乐信息
        ...(isActive && { 
          trackInfo: {
            name: trackInfo.name,
            artist: trackInfo.artist,
          },
          source: source,
        })
      }
    };

    try {
      const response = await axios.post('/chat/with_music', payload);
      const geminiMessage = { sender: 'gemini', text: response.data.reply };
      setMessages(prev => [...prev, geminiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { sender: 'gemini', text: '抱歉，我现在有点走神了，稍后再试吧。' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentMusic = () => (
    <Paper 
        variant="outlined" 
        sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderColor: 'divider' }}
    >
        <Avatar sx={{ bgcolor: 'primary.light' }}><FaMusic /></Avatar>
        <Box>
            <Typography variant="caption" color="text.secondary">
                {isActive ? '正在播放:' : '当前无播放'}
            </Typography>
            <Typography 
                variant="body2" 
                fontWeight={500} 
                noWrap
                sx={{ maxWidth: { xs: 200, sm: '100%' } }}
            >
                {isActive ? `${trackInfo.name} - ${trackInfo.artist}` : '分享你喜欢的歌吧！'}
            </Typography>
        </Box>
    </Paper>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '65vh' }}>
        <Typography variant="h6" gutterBottom>与 Gemini 一起听</Typography>
        
        {renderCurrentMusic()}
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
            <List>
                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            <ListItem sx={messageBubble(msg.sender === 'user')}>
                                <Box sx={messageText(msg.sender === 'user')}>
                                    <ListItemText primary={msg.text} />
                                </Box>
                            </ListItem>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={chatEndRef} />
            </List>
            {isLoading && <CircularProgress size={24} sx={{ mx: 'auto', display: 'block' }} />}
        </Box>

        <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 1 }}>
            <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="聊聊这首歌..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isLoading}
            />
            <IconButton type="submit" color="primary" disabled={isLoading || !newMessage.trim()}>
                <FaPaperPlane />
            </IconButton>
        </Box>
    </Box>
  );
}

export default MusicChatView;
