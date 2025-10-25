// src/components/Settings.js (最终重构版)

import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Paper, Typography, Button, ToggleButtonGroup, ToggleButton, 
  Snackbar, Alert, Avatar, Card, CardContent
} from '@mui/material';
import { FaPalette, FaSave, FaCheck } from 'react-icons/fa';
import { MuiColorInput } from 'mui-color-input'; // 引入新的颜色选择器
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// 主题选项数据
const themes = [
  { id: 'pure', name: '纯色简约', description: '简洁优雅，支持自定义颜色', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'cute', name: '可爱华丽', description: '温馨可爱，充满活力', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { id: 'dreamy', name: '星月梦幻', description: '神秘梦幻，如星空般美丽', gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
];

// 自定义的主题选择卡片
const ThemeCard = ({ theme, isSelected, onClick }) => (
    <Card
        onClick={onClick}
        elevation={0}
        sx={{
            cursor: 'pointer',
            border: '2px solid',
            borderColor: isSelected ? 'primary.main' : 'divider',
            transition: 'all 0.3s ease',
            transform: isSelected ? 'scale(1.03)' : 'scale(1)',
            boxShadow: isSelected ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
        }}
    >
        <CardContent>
            <Box sx={{ height: 80, borderRadius: 2, mb: 2, background: theme.gradient }} />
            <Typography variant="h6" fontWeight={600}>{theme.name}</Typography>
            <Typography variant="body2" color="text.secondary">{theme.description}</Typography>
        </CardContent>
    </Card>
);

function Settings({ user, theme, customColor, onThemeChange }) {
  // 状态：使用 props 初始化，用于本地预览
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [selectedColor, setSelectedColor] = useState(customColor);
  
  // 状态：用于控制UI反馈
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 关键：当外部 props 变化时（例如，从服务器加载后），同步本地状态
  useEffect(() => {
    setSelectedTheme(theme);
    setSelectedColor(customColor);
  }, [theme, customColor]);

  // 【核心交互】当用户选择时，立即调用 onThemeChange 进行实时预览
  const handleThemeSelect = (newTheme) => {
    if (newTheme) {
      setSelectedTheme(newTheme);
      onThemeChange(newTheme, selectedColor); // 实时预览
    }
  };

  const handleColorChange = (newColor) => {
    setSelectedColor(newColor);
    onThemeChange(selectedTheme, newColor); // 实时预览
  };

  // 保存到后端
  const handleSave = async () => {
    try {
      setSaving(true);
      // 注意：这里的路径是 '/user/profile'，没有 '/api'
      await axios.put('/user/profile', {
        theme: selectedTheme,
        custom_color: selectedColor,
      });
      setSnackbarOpen(true);
    } catch (error) {
      console.error('保存设置失败:', error);
      // 可以在这里添加一个错误提示的 Snackbar
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxWidth="1000px" mx="auto" p={{ xs: 1, sm: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        <FaPalette /> 设置
      </Typography>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          外观设置
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          选择一个你喜欢的主题，让“陪伴空间”更懂你。
        </Typography>

        <Grid container spacing={3}>
          {themes.map((themeOption) => (
            <Grid item xs={12} md={4} key={themeOption.id}>
              <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
                <ThemeCard 
                  theme={themeOption}
                  isSelected={selectedTheme === themeOption.id}
                  onClick={() => handleThemeSelect(themeOption.id)}
                />
              </motion.div>
            </Grid>
          ))}
        </Grid>
        
        {/* 条件渲染颜色选择器 */}
        <AnimatePresence>
          {selectedTheme === 'pure' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ marginTop: '32px' }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                自定义主色调
              </Typography>
              <MuiColorInput 
                format="hex"
                value={selectedColor} 
                onChange={handleColorChange} 
                sx={{ width: '100%', maxWidth: '300px' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Paper>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<FaSave />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 99, px: 4, py: 1.5, fontWeight: 600 }}
        >
          {saving ? '保存中...' : '保存更改'}
        </Button>
      </Box>

      {/* 保存成功的提示 */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          设置已成功保存！
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Settings;
