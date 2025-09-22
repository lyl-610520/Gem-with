import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns'; // [新增] 强大的日期格式化工具

// [新增] 引入MUI日期选择器及其适配器
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import zhCN from 'date-fns/locale/zh-CN'; // 引入中文语言包

// 从MUI导入所需组件
import {
  Container, Box, Typography, Button, CircularProgress, Alert,
  Card, CardContent, CardActions, IconButton, Chip, Fab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  ToggleButtonGroup, ToggleButton, Snackbar, Tabs, Tab, Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoodIcon from '@mui/icons-material/Mood';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SpaIcon from '@mui/icons-material/Spa';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

// 心情选项配置 (保持不变)
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

  // [新增] UI状态：当前选择的标签页和日期
  const [selectedTab, setSelectedTab] = useState(0); // 0 for User, 1 for Gemini
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchDiaries = async () => {
      try {
        setLoading(true);
        setError('');
        // [改造] API请求现在会带上格式化后的日期
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const response = await axios.get(`/diary?date=${dateStr}`);
        setDiaries(response.data.diaries);
      } catch (err) {
        setError('获取日记失败，请稍后刷新重试。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiaries();
  }, [selectedDate]); // [改造] 当日期变化时，重新获取日记

  // [新增] 触发Gemini写日记的函数
  const triggerGemini = async () => {
    setIsSubmitting(true);
    setSnackbar({ open: true, message: '正在呼唤Gemini...' });
    try {
        const response = await axios.post('/api/diary/trigger-gemini');
        if (response.data.gemini_diary) {
            // 如果成功创建了新日记，将其加入列表
            setDiaries(prev => [...prev, response.data.gemini_diary]);
            setSnackbar({ open: true, message: 'Gemini的日记已送达！' });
        } else {
            setSnackbar({ open: true, message: response.data.message || 'Gemini今天已经写过日记啦。' });
        }
    } catch (err) {
        setSnackbar({ open: true, message: '呼唤Gemini失败了...' });
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await axios.post('/diary', formData);
      // [改造] 只添加用户自己的日记
      setDiaries(prev => [response.data.diary, ...prev]);
      setShowModal(false);
      setSnackbar({ open: true, message: '日记发布成功！' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '发布失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (diaryId) => {
    const originalDiaries = [...diaries];
    setDiaries(diaries.filter(d => d.id !== diaryId));
    try {
      await axios.delete(`/diary/${diaryId}`);
      setSnackbar({ open: true, message: '删除成功！' });
    } catch (err) {
      setDiaries(originalDiaries);
      setSnackbar({ open: true, message: '删除失败，请重试。' });
    }
  };
  
  // [改造] 使用 useMemo 进行性能优化，在 diaries 或 selectedTab 变化时才重新计算
  const filteredDiaries = useMemo(() => {
    return diaries
      .filter(d => d.is_gemini_written === (selectedTab === 1))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [diaries, selectedTab]);

  return (
    // [新增] 必须用 LocalizationProvider 包裹日期选择器
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📖 日记本
          </Typography>
          <DatePicker
            label="选择日期"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            renderInput={(params) => <TextField {...params} />}
            format="yyyy年MM月dd日"
          />
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} centered>
            <Tab icon={<PersonIcon />} label="我的日记" />
            <Tab icon={<SmartToyIcon />} label="Gemini的日记" />
          </Tabs>
        </Box>
        
        {/* 内容区域 */}
        {loading ? (
            <Box>
                <Skeleton variant="rectangular" height={150} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={150} />
            </Box>
        ) : filteredDiaries.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ mt: 10, p: 3 }}>
            {selectedTab === 0 ? "今天还没有写日记哦，点击右下角的加号记录一下吧！" : "Gemini今天还没有写日记呢。"}
            {selectedTab === 1 && <Button onClick={triggerGemini} disabled={isSubmitting} startIcon={<AutoStoriesIcon/>} sx={{mt: 2}}>让Gemini写一篇今日总结</Button>}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredDiaries.map(diary => (
              <Card key={diary.id}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(diary.created_at), 'HH:mm')}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', my: 2 }}>
                    {diary.content}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  {diary.mood && moodOptions[diary.mood] ? (
                    <Chip icon={moodOptions[diary.mood].icon} label={moodOptions[diary.mood].label} color={moodOptions[diary.mood].color} variant="outlined" />
                  ) : <div />}
                  {/* [改造] 现在可以删除任何人的日记 */}
                  <IconButton size="small" onClick={() => handleDelete(diary.id)}><DeleteIcon /></IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
        
        {/* [改造] 只在“我的日记”标签页显示添加按钮 */}
        {selectedTab === 0 && (
          <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32 }} onClick={() => setShowModal(true)}>
            <AddIcon />
          </Fab>
        )}

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
