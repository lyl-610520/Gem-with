// src/components/Reading.js (支持分享书籍的最终版)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Card, CardActionArea, CardContent, CardMedia,
  Fab, Modal, Button, CircularProgress, Alert, Snackbar, IconButton, Tabs, Tab,
  Tooltip // [新增]
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'; // [新增] 好友分享图标

// [新增] 这是一个可复用的书籍网格组件，避免代码重复
const BookGrid = ({ books, isMyBooks, onDelete }) => (
  <Grid container spacing={{ xs: 2, md: 3 }}>
    {books.map((book) => (
      <Grid item key={book.id} xs={6} sm={4} md={3} lg={2}>
        <Card sx={{ position: 'relative', '&:hover .delete-button': { opacity: 1 } }}>
          {isMyBooks && ( // [修改] 只有自己的书才显示删除按钮
            <IconButton
              className="delete-button"
              onClick={(e) => onDelete(e, book.id)}
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
          )}
          <Link to={`/reading/${book.id}`} style={{ textDecoration: 'none' }}>
            <CardActionArea>
              <CardMedia
                sx={{ aspectRatio: '2 / 3', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'grey.200' }}
              >
                {book.cover_image_data ? (
                  <img
                    src={`data:image/jpeg;base64,${book.cover_image_data}`}
                    alt={book.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <BrokenImageIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                )}
              </CardMedia>
              <CardContent sx={{p: 1}}>
                <Typography noWrap title={book.title} sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                  {book.title}
                </Typography>
                <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>
                  {book.author}
                </Typography>
                {/* [新增] 如果是分享的书，显示分享者信息 */}
                {book.shared_by && (
                  <Tooltip title={`由 ${book.shared_by.username} 分享`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5 }}>
                      <SupervisorAccountIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                      <Typography variant="caption">{book.shared_by.username}</Typography>
                    </Box>
                  </Tooltip>
                )}
              </CardContent>
            </CardActionArea>
          </Link>
        </Card>
      </Grid>
    ))}
  </Grid>
);

function Reading({ user }) {
  // [修改] 状态分为我自己的书和分享的书
  const [myBooks, setMyBooks] = useState([]);
  const [sharedBooks, setSharedBooks] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0 for my books, 1 for shared

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
      // [修改] 处理新的API响应结构
      setMyBooks(response.data.my_books);
      setSharedBooks(response.data.shared_books);
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
        setMyBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
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
      setMyBooks(prevBooks => [response.data.book, ...prevBooks]);
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
        <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}>
          {/* [新增] Tabs 用于切换 */}
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="我的书籍" />
            <Tab label="好友分享" />
          </Tabs>
        </Box>
        
        {/* 根据当前 Tab 显示不同的内容 */}
        {activeTab === 0 && (
          <BookGrid books={myBooks} isMyBooks={true} onDelete={handleDeleteBook} />
        )}
        {activeTab === 1 && (
          sharedBooks.length > 0 
            ? <BookGrid books={sharedBooks} isMyBooks={false} />
            : <Typography color="text.secondary" textAlign="center" mt={5}>还没有好友与你分享书籍哦。</Typography>
        )}
      </Container>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32 }} onClick={() => setShowUploadModal(true)}>
        <AddIcon />
      </Fab>

      {/* Upload Modal (保持不变) */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 400 }, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 24, p: 4, }}>
          <Typography variant="h6" component="h2" mb={2}>添加新书 (EPUB)</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>应用会自动从文件中读取书名、作者和封面。</Typography>
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
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </>
  );
}

export default Reading;
