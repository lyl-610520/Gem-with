// src/components/Reader.js (最终体验优化版)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSwipeable } from 'react-swipeable';
import {
  Container, Box, Paper, Typography, IconButton, CircularProgress,
  Alert, LinearProgress
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';

// [新增] 一个防抖工具函数，防止窗口大小变化时过于频繁地计算
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function Reader() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pageContentRef = useRef(null);

  const goToNextPage = useCallback(() => {
    // [修正] 确保 pages 数组不为空
    if (pages.length > 0) {
      setCurrentPage(prev => Math.min(prev + 1, pages.length - 1));
    }
  }, [pages.length]);

  const goToPrevPage = useCallback(() => {
    if (pages.length > 0) {
      setCurrentPage(prev => Math.max(prev - 1, 0));
    }
  }, [pages.length]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => goToNextPage(),
    onSwipedRight: () => goToPrevPage(),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const paginateText = useCallback(() => {
    if (!book || !pageContentRef.current) return;

    const container = pageContentRef.current;
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    // [核心修正] 如果容器还没有真实高度，就直接退出，等待下一次渲染
    if (containerHeight <= 0) {
      console.log("容器高度为0，等待下一次渲染...");
      return;
    }
    
    // [核心修正] 分页前先显示加载状态，避免看到内容“跳动”
    setLoading(true);

    // [核心修正] 使用更可靠的方式处理中英文混合文本
    // 我们不再按单词分割，而是按段落分割，再逐字填充
    const paragraphs = book.content.split(/\n+/);
    const newPages = [];
    let currentPageContent = '';
    
    // 创建测量工具
    const measureDiv = document.createElement('div');
    measureDiv.style.width = `${containerWidth}px`;
    measureDiv.style.fontFamily = getComputedStyle(container).fontFamily;
    measureDiv.style.fontSize = getComputedStyle(container).fontSize;
    measureDiv.style.lineHeight = getComputedStyle(container).lineHeight;
    measureDiv.style.whiteSpace = 'pre-wrap'; // 保持和显示样式一致
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.position = 'absolute';
    document.body.appendChild(measureDiv);

    paragraphs.forEach(paragraph => {
      // 每次处理一个完整的段落
      const testContent = currentPageContent + (currentPageContent ? '\n' : '') + paragraph;
      measureDiv.innerText = testContent;

      if (measureDiv.scrollHeight > containerHeight) {
        newPages.push(currentPageContent); // 保存上一页
        currentPageContent = paragraph; // 新的一页从这个新段落开始
      } else {
        currentPageContent = testContent;
      }
    });
    newPages.push(currentPageContent); // 保存最后一页

    document.body.removeChild(measureDiv);
    
    setPages(newPages);
    setCurrentPage(0); // [修正] 分页后，总是回到第一页
    setLoading(false);
  }, [book]);

  // 1. 获取书籍数据
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`/books/${bookId}`);
        setBook(response.data);
      } catch (err) {
        setError('加载书籍失败，这本书可能不存在。');
        setLoading(false);
      }
    };
    fetchBookDetails();
  }, [bookId]);

  // 2. 当书籍数据加载完成时，进行分页
  useEffect(() => {
    // 只有当book有数据时，才尝试分页
    if (book) {
      // 使用一个短暂的延迟，确保DOM元素已经渲染并获得了正确的尺寸
      const timer = setTimeout(paginateText, 100);
      return () => clearTimeout(timer);
    }
  }, [book, paginateText]);

  // 3. 监听窗口大小变化，重新分页
  useEffect(() => {
    // [改造] 使用防抖函数，优化性能
    const debouncedPaginate = debounce(paginateText, 300);
    window.addEventListener('resize', debouncedPaginate);
    return () => window.removeEventListener('resize', debouncedPaginate);
  }, [paginateText]);


  // [改造] 将加载状态分为两种
  const isFetchingBook = !book && loading;
  const isPaginating = book && loading;

  if (isFetchingBook) return <Container sx={{textAlign: 'center', mt: 10}}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{mt: 4}}>{error}</Alert></Container>;

  return (
    <Container maxWidth="md" sx={{
      height: 'calc(100vh - 64px)', // 减去Header的高度
      display: 'flex', flexDirection: 'column', py: 3,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <IconButton component={Link} to="/reading">
          <HomeIcon /><Typography sx={{ml: 1}}>书架</Typography>
        </IconButton>
        <Typography variant="h6" noWrap sx={{textAlign: 'center', flexGrow: 1}}>
          {book?.title}
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
        <IconButton onClick={goToPrevPage} disabled={currentPage === 0} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
          <ArrowBackIosNew />
        </IconButton>
        
        <Paper {...swipeHandlers} ref={pageContentRef} elevation={4} sx={{
          flexGrow: 1, height: '100%', p: { xs: 3, sm: 4 },
          overflow: 'hidden', backgroundColor: '#FDFCF7', color: '#3C3C3C',
          touchAction: 'pan-y', position: 'relative',
        }}>
          {isPaginating ? (
            <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
              <CircularProgress />
              <Typography sx={{mt: 2}}>正在智能分页...</Typography>
            </Box>
          ) : (
            <Typography sx={{
              fontSize: '1.1rem', lineHeight: 1.8, textAlign: 'justify',
              whiteSpace: 'pre-wrap', // [核心] 保留换行和空格
              height: '100%', // 确保Typography撑满Paper
            }}>
              {pages[currentPage]}
            </Typography>
          )}
        </Paper>
        
        <IconButton onClick={goToNextPage} disabled={!pages.length || currentPage === pages.length - 1} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
          <ArrowForwardIos />
        </IconButton>
      </Box>

      <Box sx={{ pt: 2, flexShrink: 0 }}>
        <Typography align="center" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {pages.length > 0 ? `第 ${currentPage + 1} / ${pages.length} 页` : '计算页码中...'}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={!pages.length || pages.length === 1 ? 100 : ((currentPage + 1) / pages.length) * 100}
        />
      </Box>
    </Container>
  );
}

export default Reader;
