// src/components/Reading.js (最终严谨版)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Card, CardActionArea, CardContent,
  Fab, Modal, TextField, Button, CircularProgress, Alert, Snackbar, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DeleteIcon from '@mui/icons-material/Delete'; // 确保导入删除图标

// Modal 弹窗的样式 (MUI风格)
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

function Reading({ user }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 上传表单的状态
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/books');
      setBooks(response.data.books);
    } catch (err) {
      setError('获取书架失败，请稍后刷新。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (e, bookId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('确定要删除这本书吗？这本书的所有批注也会被一并删除。')) {
      try {
        await axios.delete(`/books/${bookId}`);
        setSnackbar({ open: true, message: '书籍已删除' });
        setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
      } catch (err) {
        setSnackbar({ open: true, message: '删除失败，请重试' });
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setSnackbar({ open: true, message: '请选择一个 .txt 文件' });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || '未命名书籍');
    formData.append('author', author || '未知作者');
    try {
      await axios.post('/books', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnackbar({ open: true, message: '上传成功！' });
      setShowUploadModal(false);
      resetForm();
      fetchBooks();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '上传失败' });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setFile(null);
  };

  if (loading) return <Container sx={{ textAlign: 'center', mt: 10 }}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{ mt: 4 }}>{error}</Alert></Container>;

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, pb: 10 /* 为悬浮按钮留出空间 */ }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📚 我的书架
          </Typography>
        </Box>

        {books.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ mt: 10 }}>
            你的书架空空如也，点击右下角的加号添加第一本书吧！
          </Typography>
        ) : (
          <Grid container spacing={4}>
            {books.map((book) => (
              <Grid item key={book.id} xs={12} sm={6} md={4} lg={3}>
                <Card
                  sx={{
                    position: 'relative',
                    height: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: '0.2s',
                    '&:hover': { transform: 'scale(1.03)', boxShadow: 6 },
                  }}
                >
                  <IconButton
                    onClick={(e) => handleDeleteBook(e, book.id)}
                    sx={{
                      position: 'absolute', top: 8, right: 8, zIndex: 2,
                      backgroundColor: 'rgba(0,0,0,0.1)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.3)' },
                      color: 'white',
                    }}
                    size="small"
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                  <Link to={`/reading/${book.id}`} style={{ textDecoration: 'none', flexGrow: 1, display: 'flex' }}>
                    <CardActionArea
                      sx={{
                        flexGrow: 1, display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center', p: 2,
                      }}
                    >
                      <MenuBookIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography gutterBottom variant="h6" component="div" noWrap sx={{ width: '100%', textAlign: 'center', color: 'text.primary' }}>
                        {book.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {book.author}
                      </Typography>
                    </CardActionArea>
                  </Link>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32 }} onClick={() => setShowUploadModal(true)}>
        <AddIcon />
      </Fab>

      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" mb={2}>
            添加新书
          </Typography>
          <form onSubmit={handleUpload}>
            <TextField label="书名" fullWidth margin="normal" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField label="作者" fullWidth margin="normal" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Button variant="contained" component="label" fullWidth sx={{ mt: 2 }}>
              选择 .txt 文件
              <input type="file" hidden accept=".txt" onChange={(e) => setFile(e.target.files[0])} />
            </Button>
            {file && <Typography sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>已选择: {file.name}</Typography>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
              <Button onClick={() => setShowUploadModal(false)} disabled={isUploading}>取消</Button>
              <Button type="submit" variant="contained" disabled={isUploading}>
                {isUploading ? <CircularProgress size={24} color="inherit" /> : '上传'}
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </>
  );
}

export default Reading;
