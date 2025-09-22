// Checkin.js (全新升级版)

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import zhCN from 'date-fns/locale/zh-CN';

// [新增] 引入MUI组件，和日记页面保持风格统一
import {
  Container, Box, Typography, Button, CircularProgress, Alert,
  Card, CardContent, Chip, Fab, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';

// 打卡类型定义
const checkinTypes = [
  { value: 'study', label: '学习' },
  { value: 'exercise', label: '运动' },
  { value: 'work', label: '工作' },
  { value: 'reading', label: '阅读' },
  { value: 'meditation', label: '冥想' },
  { value: 'creative', label: '创作' },
  { value: 'social', label: '社交' },
  { value: 'health', label: '健康' }
];

function Checkin() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // [新增] 表单数据状态
  const [formData, setFormData] = useState({ checkin_type: '', content: '' });

  // [新增] UI状态：当前选择的标签页和日期
  const [selectedTab, setSelectedTab] = useState(0); // 0 for User, 1 for Gemini
  const [selectedDate, setSelectedDate] = useState(new Date());

  // [改造] 当日期变化时，重新获取打卡记录
  useEffect(() => {
    const fetchCheckins = async () => {
      try {
        setLoading(true);
        setError('');
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        // [改造] API请求现在会带上日期
        const response = await axios.get(`/checkin?date=${dateStr}`);
        setCheckins(response.data.checkins);
      } catch (err) {
        setError('获取打卡记录失败，请稍后刷新重试。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCheckins();
  }, [selectedDate]);

  // [改造] 提交打卡的函数
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // [改造] 后端现在会返回新创建的打卡记录
      const response = await axios.post('/checkin', formData);
      const { user_checkin, gemini_checkin } = response.data;
      
      const newCheckins = [];
      if (gemini_checkin) newCheckins.push(gemini_checkin);
      if (user_checkin) newCheckins.push(user_checkin);

      // [改造] 直接将新记录添加到列表顶部，避免重新请求整个列表
      setCheckins(prev => [...newCheckins, ...prev]);
      
      setShowModal(false); // [改造] 只在成功后关闭弹窗
      setSnackbar({ open: true, message: '打卡成功！' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '打卡失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ checkin_type: '', content: '' });
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // [改造] 使用 useMemo 进行性能优化
  const filteredCheckins = useMemo(() => {
    return checkins.filter(c => c.is_gemini_checkin === (selectedTab === 1));
  }, [checkins, selectedTab]);

  // [改造] 修正了获取打卡类型标签的逻辑
  const getCheckinTypeLabel = (type) => {
    const found = checkinTypes.find(t => t.value === type);
    return found ? found.label : type;
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
      <Container maxWidth="md">
        {/* 和日记页面一样的头部 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            ✅ 打卡记录
          </Typography>
          <DatePicker
            label="选择日期"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            format="yyyy年MM月dd日"
          />
        </Box>

        {/* 和日记页面一样的Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} centered>
            <Tab icon={<PersonIcon />} label="我的打卡" />
            <Tab icon={<SmartToyIcon />} label="Gemini的打卡" />
          </Tabs>
        </Box>
        
        {/* 内容区域 */}
        {loading ? (
            <Box><Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} /><Skeleton variant="rectangular" height={120} /></Box>
        ) : filteredCheckins.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ mt: 10, p: 3 }}>
            {selectedTab === 0 ? "今天还没有打卡哦，点击右下角的加号记录一下吧！" : "Gemini今天还没有为你打卡呢。"}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredCheckins.map(checkin => (
              <Card key={checkin.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Chip label={getCheckinTypeLabel(checkin.checkin_type)} color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(checkin.created_at), 'HH:mm')}
                    </Typography>
                  </Box>
                  {checkin.content && (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                      {checkin.content}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
        
        {/* 只在“我的打卡”标签页显示添加按钮 */}
        {selectedTab === 0 && (
          <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32 }} onClick={handleOpenModal}>
            <AddIcon />
          </Fab>
        )}

        {/* 新建打卡的对话框 */}
        <Dialog open={showModal} onClose={handleCloseModal} fullWidth maxWidth="sm" disableEscapeKeyDown={isSubmitting}>
          <DialogTitle>新打卡</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <FormControl fullWidth margin="dense" required disabled={isSubmitting}>
              <InputLabel>打卡类型</InputLabel>
              <Select
                value={formData.checkin_type}
                label="打卡类型"
                onChange={(e) => setFormData(prev => ({ ...prev, checkin_type: e.target.value }))}
              >
                {checkinTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="今天发生了什么... (可选)"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              disabled={isSubmitting}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} disabled={isSubmitting}>取消</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={24} /> : '完成打卡'}
            </Button>
          </DialogActions>
        </Dialog>
      
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Container>
    </LocalizationProvider>
  );
}

export default Checkin;
