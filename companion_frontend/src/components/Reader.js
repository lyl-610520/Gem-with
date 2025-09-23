// src/components/Reader.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Container, Box, Paper, Typography, IconButton, CircularProgress,
  Alert, LinearProgress, Icon
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home'; // 用于返回书架的图标

function Reader() {
  const { bookId } = useParams(); // 从URL中获取书籍ID
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]); // 存储分页后每一页内容的数组
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // [核心魔法] 创建一个Ref来引用显示页面内容的那个div
  // 这样我们就能在它渲染后，测量它的实际高度和宽度
  const pageContentRef = useRef(null);

  // [核心魔法] 分页函数
  // 使用 useCallback 优化性能，防止不必要的重新计算
  const paginateText = useCallback(() => {
    if (!book || !pageContentRef.current) return;

    // 获取容器的尺寸
    const container = pageContentRef.current;
    const containerHeight = container.clientHeight;
    
    // 创建一个临时的、看不见的div用于测量文字高度
    const measureDiv = document.createElement('div');
    measureDiv.style.width = `${container.clientWidth}px`;
    measureDiv.style.fontFamily = 'inherit';
    measureDiv.style.fontSize = '1.1rem'; // 确保和显示样式一致
    measureDiv.style.lineHeight = '1.8';   // 确保和显示样式一致
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.position = 'absolute';
    document.body.appendChild(measureDiv);

    const words = book.content.split(/\s+/); // 将整本书内容拆分成单词
    const newPages = [];
    let currentPageContent = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testContent = currentPageContent + (currentPageContent ? ' ' : '') + word;
      measureDiv.innerText = testContent;
      
      // 如果测量div的高度超过了容器高度，说明这一页已经满了
      if (measureDiv.scrollHeight > containerHeight) {
        newPages.push(currentPageContent); // 把上一页的内容存起来
        currentPageContent = word; // 新的一页从这个单词开始
      } else {
        currentPageContent = testContent;
      }
    }
    // 把最后一页的内容也存起来
    newPages.push(currentPageContent);

    document.body.removeChild(measureDiv); // 清理掉测量div
    setPages(newPages); // 更新分页状态
    setLoading(false); // 分页完成后，才算真正加载完毕
  }, [book]); // 这个函数只在 book 数据变化时才重新创建

  // 1. 获取书籍详细数据
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`/books/${bookId}`);
        setBook(response.data);
        // 注意：这里先不设置 setLoading(false)，等分页计算完了再说
      } catch (err) {
        setError('加载书籍失败，这本书可能不存在。');
        setLoading(false);
      }
    };
    fetchBookDetails();
  }, [bookId]);

  // 2. 当书籍数据加载完成，或者窗口大小变化时，重新计算分页
  useEffect(() => {
    // 只有当book有数据，且页面容器已经渲染出来时，才进行分页
    if (book && pageContentRef.current) {
      paginateText();
    }
    
    // 监听窗口大小变化，以便重新分页
    window.addEventListener('resize', paginateText);
    return () => window.removeEventListener('resize', paginateText);
  }, [book, paginateText]);


  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, pages.length - 1));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };
  
  if (loading && !book) return <Container sx={{textAlign: 'center', mt: 10}}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{mt: 4}}>{error}</Alert></Container>;

  return (
    <Container maxWidth="md" sx={{
      height: 'calc(100vh - 64px)', // 减去Header的高度
      display: 'flex',
      flexDirection: 'column',
      py: 3,
    }}>
      {/* 顶部导航 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <IconButton component={Link} to="/reading">
          <HomeIcon />
          <Typography sx={{ml: 1}}>书架</Typography>
        </IconButton>
        <Typography variant="h6" noWrap sx={{textAlign: 'center', flexGrow: 1}}>
          {book?.title}
        </Typography>
        {/* 为了对称，放一个空的Box */}
        <Box sx={{ width: 80 }} /> 
      </Box>

      {/* 阅读器核心区域 */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
        <IconButton onClick={goToPrevPage} disabled={currentPage === 0}>
          <ArrowBackIosNew />
        </IconButton>
        
        {/* 这就是我们的“书页” */}
        <Paper ref={pageContentRef} elevation={4} sx={{
          flexGrow: 1,
          height: '100%',
          p: { xs: 3, sm: 4, md: 5 }, // 内边距随屏幕变大
          overflow: 'hidden', // 隐藏超出部分
          backgroundColor: '#FDFCF7', // 类似羊皮纸的舒适颜色
          color: '#3C3C3C',
        }}>
          {loading ? (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                <CircularProgress />
            </Box>
          ) : (
            <Typography sx={{
              fontSize: '1.1rem',
              lineHeight: 1.8,
              textAlign: 'justify', // 两端对齐，更像书
            }}>
              {pages[currentPage]}
            </Typography>
          )}
        </Paper>
        
        <IconButton onClick={goToNextPage} disabled={currentPage === pages.length - 1}>
          <ArrowForwardIos />
        </IconButton>
      </Box>

      {/* 底部进度条和页码 */}
      <Box sx={{ pt: 2, flexShrink: 0 }}>
        <Typography align="center" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          第 {currentPage + 1} / {pages.length} 页
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pages.length > 1 ? ((currentPage + 1) / pages.length) * 100 : 100}
        />
      </Box>
    </Container>
  );
}

export default Reader;
