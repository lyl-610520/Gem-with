// src/components/friends/ShareBookModal.js (全新文件)

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemAvatar, Avatar, ListItemText, CircularProgress, Typography, Box } from '@mui/material';
import axios from 'axios';

function ShareBookModal({ open, onClose, onSelectBook }) {
  const [myBooks, setMyBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      const fetchMyBooks = async () => {
        setLoading(true);
        try {
          const response = await axios.get('/books');
          setMyBooks(response.data.my_books);
        } catch (error) {
          console.error("获取我的书籍列表失败:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchMyBooks();
    }
  }, [open]);

  const handleSelect = (book) => {
    onSelectBook(book.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>选择一本书分享</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : myBooks.length > 0 ? (
          <List>
            {myBooks.map((book) => (
              <ListItem key={book.id} disablePadding>
                <ListItemButton onClick={() => handleSelect(book)}>
                  <ListItemAvatar>
                    <Avatar variant="square" src={`data:image/jpeg;base64,${book.cover_image_data}`} />
                  </ListItemAvatar>
                  <ListItemText primary={book.title} secondary={book.author} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ p: 3, textAlign: 'center' }}>你的书架是空的。</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShareBookModal;
