// src/components/friends/ChatWindow.js (全新重构版)
import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, List, ListItem, Avatar, Typography, TextField, IconButton } from '@mui/material';
import { FaPaperPlane } from 'react-icons/fa';
import useFriendChatStore from '../../stores/friendChatStore';

const ChatWindow = ({ currentUser, chatPartner, socket }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messages = useFriendChatStore((state) => state.chats[chatPartner.id] || []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && socket) {
      socket.emit('private_message', {
        recipient_id: chatPartner.id,
        message: input.trim(),
      });
      setInput('');
    }
  };

  return (
    <Paper elevation={2} sx={{ height: '75vh', display: 'flex', flexDirection: 'column', borderRadius: 4 }}>
      <Box p={2} borderBottom="1px solid" borderColor="divider">
        <Typography variant="h6">与 {chatPartner.username} 聊天中</Typography>
      </Box>
      <List sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((msg, index) => {
          const isMine = msg.from_user_id === currentUser.id;
          return (
            <ListItem key={index} sx={{ flexDirection: isMine ? 'row-reverse' : 'row', gap: 1.5, alignItems: 'flex-end' }}>
              {!isMine && <Avatar>{chatPartner.username.charAt(0).toUpperCase()}</Avatar>}
              <Box sx={{
                bgcolor: isMine ? 'primary.main' : 'background.paper',
                color: isMine ? 'primary.contrastText' : 'text.primary',
                p: 1.5, borderRadius: 4, maxWidth: '75%',
              }}>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
              </Box>
            </ListItem>
          );
        })}
        <div ref={messagesEndRef} />
      </List>
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="输入消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton type="submit" color="primary" disabled={!input.trim()}>
                <FaPaperPlane />
              </IconButton>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default ChatWindow;
