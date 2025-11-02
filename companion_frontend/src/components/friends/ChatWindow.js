// src/components/friends/ChatWindow.js (支持书籍分享的最终版)

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Box, Paper, List, ListItem, Avatar, Typography, TextField, IconButton, Card, CardActionArea, CardContent, CardMedia, Tooltip } from '@mui/material';
import { FaPaperPlane, FaBookMedical } from 'react-icons/fa'; // [新增] 图书图标
import useFriendChatStore from '../../stores/friendChatStore';
import ShareBookModal from './ShareBookModal'; // [新增] 导入模态框

// [新增] 书籍分享卡片组件
const BookShareCard = ({ book }) => (
  <Card sx={{ maxWidth: 250, my: 1 }}>
    <CardActionArea component={Link} to={`/reading/${book.id}`}>
      <CardMedia
        component="img"
        height="140"
        image={`data:image/jpeg;base64,${book.cover_image_data}`}
        alt={book.title}
        sx={{ objectFit: 'contain', bgcolor: 'grey.200' }}
      />
      <CardContent>
        <Typography gutterBottom variant="h6" component="div" noWrap>{book.title}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{book.author}</Typography>
        <Typography variant="caption" color="primary">点击一起阅读</Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

const ChatWindow = ({ currentUser, chatPartner, socket }) => {
  const [input, setInput] = useState('');
  const [showShareModal, setShowShareModal] = useState(false); // [新增]
  const messagesEndRef = useRef(null);
  const messages = useFriendChatStore((state) => state.chats[chatPartner.id] || []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleShareBook = (bookId) => {
    if (socket) {
      socket.emit('private_message', {
        recipient_id: chatPartner.id,
        type: 'book_share', // [核心]
        book_id: bookId,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && socket) {
      socket.emit('private_message', {
        recipient_id: chatPartner.id,
        type: 'text', // [核心]
        message: input.trim(),
      });
      setInput('');
    }
  };

  return (
    <>
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
                  p: msg.type === 'book_share' ? 0.5 : 1.5, // 卡片不需要太多内边距
                  borderRadius: 4, maxWidth: '75%',
                }}>
                  {/* [核心改造] 根据消息类型渲染不同内容 */}
                  {msg.type === 'book_share' ? (
                    <BookShareCard book={msg.content} />
                  ) : (
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                  )}
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
              startAdornment: ( // [新增] 分享按钮
                <Tooltip title="分享书籍">
                  <IconButton onClick={() => setShowShareModal(true)}>
                    <FaBookMedical />
                  </IconButton>
                </Tooltip>
              ),
              endAdornment: (
                <IconButton type="submit" color="primary" disabled={!input.trim()}>
                  <FaPaperPlane />
                </IconButton>
              ),
            }}
          />
        </Box>
      </Paper>
      {/* [新增] 模态框组件 */}
      <ShareBookModal 
        open={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        onSelectBook={handleShareBook}
      />
    </>
  );
};

export default ChatWindow;
