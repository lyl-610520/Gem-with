// src/components/Dashboard.js (最终重构版)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, Avatar, Skeleton, Card, CardContent, Button } from '@mui/material';
import { FaBook, FaCheckCircle, FaBookOpen, FaHeart, FaPlus } from 'react-icons/fa';
import { GiTomato, GiSprout } from "react-icons/gi"; // 番茄和花园图标
import axios from 'axios';

// 欢迎卡片组件
const WelcomeCard = ({ username, loading }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "早上好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(135deg, #81c784 0%, #64b5f6 100%)', color: 'white' }}>
      <Typography variant="h4" fontWeight={700}>
        {loading ? <Skeleton width="60%" /> : `${getGreeting()}，${username}！`}
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.9 }}>
        {loading ? <Skeleton width="80%" /> : "今天也是充满希望的一天，让我们开始吧 🌟"}
      </Typography>
    </Paper>
  );
};

// 统计数据卡片组件
const StatCard = ({ icon, value, label, color, loading }) => (
  <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 4 }}>
    <Avatar sx={{ bgcolor: color, width: 56, height: 56, color: 'white' }}>{icon}</Avatar>
    <Box>
      <Typography variant="h4" fontWeight={700}>
        {loading ? <Skeleton width={50} /> : value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  </Paper>
);

// 快速入口/占位符卡片组件
const ActionCard = ({ icon, title, description, path, isPlaceholder, onClick }) => (
  <Card 
    elevation={0} 
    onClick={onClick}
    sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 4,
      cursor: isPlaceholder ? 'not-allowed' : 'pointer',
      opacity: isPlaceholder ? 0.6 : 1,
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      '&:hover': {
        transform: isPlaceholder ? 'none' : 'translateY(-4px)',
        boxShadow: isPlaceholder ? 'none' : '0 10px 20px rgba(0,0,0,0.08)'
      }
    }}
  >
    <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
      <Avatar sx={{ bgcolor: 'primary.light', width: 64, height: 64, margin: '0 auto 16px', fontSize: '2rem' }}>
        {icon}
      </Avatar>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
);

function Dashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/dashboard/summary');
        setSummary(response.data);
      } catch (error) {
        console.error("获取首页数据失败:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const stats = summary?.stats || {};

  return (
    <Box p={{ xs: 1, sm: 2 }}>
      <Grid container spacing={3}>
        
        {/* -- 欢迎区域 -- */}
        <Grid item xs={12}>
          <WelcomeCard username={summary?.username || user.username} loading={loading} />
        </Grid>

        {/* -- 核心统计数据 -- */}
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<FaBook />} value={stats.diaries} label="篇日记" color="#ffb74d" loading={loading} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<FaCheckCircle />} value={stats.checkins} label="次打卡" color="#4db6ac" loading={loading} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<FaHeart />} value={stats.streak} label="天连续" color="#e57373" loading={loading} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<FaBookOpen />} value={stats.books} label="本书籍" color="#9575cd" loading={loading} /></Grid>

        {/* -- 主要功能区 -- */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>快速开始</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><ActionCard icon={<FaPlus />} title="写新日记" description="记录今天的点点滴滴" onClick={() => navigate('/diary')} /></Grid>
                <Grid item xs={12} sm={6}><ActionCard icon={<GiTomato />} title="番茄钟" description="专注工作，即将推出" isPlaceholder /></Grid>
                <Grid item xs={12} sm={6}><ActionCard icon={<FaCheckCircle />} title="去打卡" description="完成今日份的好习惯" onClick={() => navigate('/checkin')} /></Grid>
                <Grid item xs={12} sm={6}><ActionCard icon={<GiSprout />} title="我的花园" description="用专注浇灌成长，敬请期待" isPlaceholder /></Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* -- 最新日记预览 -- */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 2, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>最新日记</Typography>
              {loading ? (
                <>
                  <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                  <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                  <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
                </>
              ) : summary?.latest_diary ? (
                <Typography variant="body2" color="text.secondary">
                  {summary.latest_diary.content_snippet}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  还没有写日记，从今天开始记录吧！
                </Typography>
              )}
            </CardContent>
            <Button fullWidth variant="contained" onClick={() => navigate('/diary')} sx={{ mt: 'auto' }}>
              查看日记
            </Button>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}

export default Dashboard;
