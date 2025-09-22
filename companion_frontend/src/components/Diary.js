import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// [核心改造] 从MUI和MUI图标库导入所需组件
import {
  Container, Box, Typography, Button, CircularProgress, Alert,
  Card, CardContent, CardActions, IconButton, Chip, Fab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  ToggleButtonGroup, ToggleButton, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoodIcon from '@mui/icons-material/Mood'; // 开心
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied'; // 难过
import WhatshotIcon from '@mui/icons-material/Whatshot'; // 兴奋
import SpaIcon from '@mui/icons-material/Spa'; // 平静
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Gemini
import PersonIcon from '@mui/icons-material/Person'; // 我

// 心情选项配置
const moodOptions = {
  happy: { label: '开心', icon: <MoodIcon />, color: 'success' },
  sad: { label: '难过', icon: <SentimentVeryDissatisfiedIcon />, color: 'error' },
  excited: { label: '兴奋', icon: <WhatshotIcon />, color: 'warning' },
  calm: { label: '平静', icon: <SpaIcon />, color: 'info' },
};

function Diary() {
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ content: '', mood: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // 使用 useCallback 优化性能，防止不必要的重渲染
  const fetchDiaries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/diary?per_page=50'); // 一次加载更多
      setDiaries(response.data.diaries);
    } catch (err) {
      setError('获取日记失败，请稍后刷新重试。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  const handleOpenModal = () => {
    setFormData({ content: '', mood: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const response = await axios.post('/diary', formData);
      // [关键逻辑] 直接使用后端返回的新日记数据，实现即时更新
      const { user_diary, gemini_diary } = response.data;
      const newDiaries = [user_diary];
      if (gemini_diary) {
        newDiaries.unshift(gemini_diary); // Gemini的日记放最前面
      }
      // 将新日记添加到列表顶部，而不是重新请求整个列表
      setDiaries(prevDiaries => [...newDiaries, ...prevDiaries]);
      
      handleCloseModal();
      setSnackbar({ open: true, message: '日记发布成功！' });
    } catch (err) {
      setError(err.response?.data?.error || '发布失败，请重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (diaryId) => {
    // 乐观更新：先从UI上移除，如果失败再加回来
    const originalDiaries = [...diaries];
    setDiaries(diaries.filter(d => d.id !== diaryId));
    setSnackbar({ open: true, message: '正在删除...' });

    try {
      await axios.delete(`/diary/${diaryId}`);
      setSnackbar({ open: true, message: '删除成功！' });
    } catch (err) {
      // 如果删除失败，恢复原来的列表并提示用户
      setDiaries(originalDiaries);
      setSnackbar({ open: true, message: '删除失败，请重试。' });
      console.error(err);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Container maxWidth="md">
      {/* 页面头部 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          📖 我的日记
        </Typography>
        {/* Fab 是悬浮操作按钮，更适合移动端 */}
        <Fab color="primary" aria-label="add" onClick={handleOpenModal}>
          <AddIcon />
        </Fab>
      </Box>

      {/* 加载与错误提示 */}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>}
      {error && !loading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 日记列表 */}
      {!loading && diaries.length === 0 && (
        <Typography align="center" color="text.secondary" sx={{ mt: 10 }}>
          📝 还没有日记呢，点击右下角按钮开始记录吧！
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {diaries.map(diary => (
          <Card key={diary.id} elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Chip
                  icon={diary.is_gemini_written ? <SmartToyIcon /> : <PersonIcon />}
                  label={diary.is_gemini_written ? 'Gemini' : '我'}
                  color={diary.is_gemini_written ? "secondary" : "primary"}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(diary.created_at)}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', my: 2 }}>
                {diary.content}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
              {diary.mood && moodOptions[diary.mood] ? (
                <Chip
                  icon={moodOptions[diary.mood].icon}
                  label={moodOptions[diary.mood].label}
                  color={moodOptions[diary.mood].color}
                  variant="outlined"
                />
              ) : <div />}
              {!diary.is_gemini_written && (
                <IconButton size="small" onClick={() => handleDelete(diary.id)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* 新建/编辑日记的对话框 */}
      <Dialog open={showModal} onClose={handleCloseModal} fullWidth maxWidth="sm" disableEscapeKeyDown={isSubmitting}>
        <DialogTitle>写新日记</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            label="今天发生了什么..."
            type="text"
            fullWidth
            multiline
            rows={8}
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            disabled={isSubmitting}
          />
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>选择心情</Typography>
          <ToggleButtonGroup
            value={formData.mood}
            exclusive
            onChange={(e, newMood) => setFormData(prev => ({ ...prev, mood: newMood }))}
            disabled={isSubmitting}
          >
            {Object.entries(moodOptions).map(([key, { label, icon }]) => (
              <ToggleButton key={key} value={key}>
                {icon} &nbsp; {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={isSubmitting}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : '发布'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 全局提示条 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
}

export default Diary;
