// src/components/Reading.js (改造后成为书架 Bookshelf)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // 用于点击书本后跳转
import {
  Container, Box, Typography, Grid, Card, CardActionArea, CardContent,
  Fab, Modal, TextField, Button, CircularProgress, Alert, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// Modal 弹窗的样式 (MUI风格)
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 400 }, // 在小屏幕上宽度为90%，大屏幕为400px
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

// [重要] 把组件名从 Bookshelf 改为 Reading，以匹配你的 App.js
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
      fetchBooks(); // 上传成功后，重新加载书架
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

  if (loading) return <Container sx={{textAlign: 'center', mt: 10}}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{mt: 4}}>{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
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
              <Link to={`/reading/${book.id}`} style={{ textDecoration: 'none' }}>
                <Card sx={{ height: 200, display: 'flex', flexDirection: 'column', transition: '0.2s', '&:hover': {transform: 'scale(1.03)'} }}>
                  <CardActionArea sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                      <MenuBookIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography gutterBottom variant="h6" component="div" noWrap sx={{width: '100%', textAlign: 'center'}}>
                        {book.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {book.author}
                      </Typography>
                  </CardActionArea>
                </Card>
              </Link>
            </Grid>
          ))}
        </Grid>
      )}

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
    </Container>
  );
}

// [重要] 确保导出的组件名是 Reading
export default Reading;
