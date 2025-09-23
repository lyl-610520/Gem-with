// src/components/Reading.js (最终Base64版 - 书架)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Card, CardActionArea, CardContent, CardMedia,
  Fab, Modal, Button, CircularProgress, Alert, Snackbar, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';

const modalStyle = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper', borderRadius: 2, boxShadow: 24, p: 4,
};

function Reading({ user }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => { fetchBooks(); }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/books');
      setBooks(response.data.books);
    } catch (err) {
      setError('获取书架失败，请稍后刷新。');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (e, bookId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('确定要删除这本书吗？')) {
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
      setSnackbar({ open: true, message: '请选择一个 .epub 文件' });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('/books', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnackbar({ open: true, message: '上传成功！' });
      setBooks(prevBooks => [response.data.book, ...prevBooks]);
      setShowUploadModal(false);
      setFile(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '上传失败' });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <Container sx={{textAlign: 'center', mt: 10}}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{mt: 4}}>{error}</Alert></Container>;

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📚 我的书架
          </Typography>
        </Box>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {books.map((book) => (
            <Grid item key={book.id} xs={6} sm={4} md={3} lg={2}>
              <Card sx={{ position: 'relative', '&:hover .delete-button': { opacity: 1 } }}>
                <IconButton /* ... */ />
                {/* [核心改造] Link现在只传递title，通过URL的bookId来加载内容 */}
                <Link to={`/reading/${book.id}`} state={{ title: book.title }} style={{ textDecoration: 'none' }}>
                  <CardActionArea>
                    <CardMedia /* ... */ />
                    <CardContent sx={{p: 1}}>
                      <Typography noWrap title={book.title} sx={{ color: 'text.primary', fontWeight: 'bold' }}>{book.title}</Typography>
                      <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>{book.author}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Link>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      {/* ... (Fab, Modal, Snackbar 代码不变) ... */}
    </>
  );
}

export default Reading;
