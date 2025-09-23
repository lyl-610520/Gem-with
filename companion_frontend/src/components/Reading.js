// src/components/Reading.js (EPUB版书架)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Card, CardActionArea, CardContent, CardMedia,
  Fab, Modal, Button, CircularProgress, Alert, Snackbar, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

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

  // 上传文件状态
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

  // [改造] 上传逻辑现在更简单了
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
  
  if (loading) return <Container sx={{ textAlign: 'center', mt: 10 }}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{ mt: 4 }}>{error}</Alert></Container>;

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📚 我的书架
          </Typography>
        </Box>

        {books.length === 0 && !loading ? (
            <Typography align="center" color="text.secondary" sx={{ mt: 10 }}>
                你的书架空空如也，点击右下角的加号添加第一本书吧！
            </Typography>
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {books.map((book) => (
              <Grid item key={book.id} xs={6} sm={4} md={3} lg={2}>
                <Card sx={{ position: 'relative', '&:hover .delete-button': { opacity: 1 } }}>
                  <IconButton
                    className="delete-button"
                    onClick={(e) => handleDeleteBook(e, book.id)}
                    sx={{
                      position: 'absolute', top: 4, right: 4, zIndex: 2,
                      backgroundColor: 'rgba(0,0,0,0.5)', color: 'white',
                      opacity: 0, transition: 'opacity 0.2s',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                    }}
                    size="small"
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                  <Link to={`/reading/${book.id}`} state={{ epubUrl: book.epub_url, title: book.title }} style={{ textDecoration: 'none' }}>
                    <CardActionArea>
                      {/* [核心改造] 显示真实的封面！ */}
                      <CardMedia
                        component="img"
                        sx={{
                          aspectRatio: '2 / 3',
                          objectFit: 'cover',
                          backgroundColor: '#eee'
                        }}
                        image={book.cover_image_data ? `data:image/jpeg;base64,${book.cover_image_data}` : "/placeholder-cover.jpg"}
                        alt={book.title}
                      />
                      <CardContent sx={{ p: 1 }}>
                        <Typography noWrap title={book.title} sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                          {book.title}
                        </Typography>
                        <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>
                          {book.author}
                        </Typography>
                      </CardContent>
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

      {/* [改造] 上传弹窗，不再需要书名和作者输入框 */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" mb={2}>
            添加新书 (EPUB)
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            应用会自动从文件中读取书名、作者和封面。
          </Typography>
          <form onSubmit={handleUpload}>
            <Button variant="contained" component="label" fullWidth sx={{ mt: 2 }}>
              选择 .epub 文件
              <input type="file" hidden accept=".epub" onChange={(e) => setFile(e.target.files[0])} />
            </Button>
            {file && <Typography sx={{ mt: 1, textAlign: 'center' }}>已选择: {file.name}</Typography>}
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
