// src/components/Reader.js (最终逻辑自洽版)
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import { useSwipeable } from 'react-swipeable';
// [核心] 我们不再需要 axios 来加载书籍内容了！
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemButton, ListItemText, Alert
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';

function Reader() {
  const { bookId } = useParams();
  const location = useLocation();
  const { title } = location.state || {};

  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const viewerRef = useRef(null);

// src/components/Reader.js (最终正确修复版)

useEffect(() => {
    let book;
    
    if (!bookId) {
      setError("无法加载书籍，未找到书籍ID。");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // --- VVVV  从这里开始是核心修改 VVVV ---

      // 1. 获取您在环境变量中为 axios 配置的后端基础URL
      const baseApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      // 2. 从这个URL中移除可能存在的 '/api' 后缀，得到纯粹的后端根地址
      //    例如: 'https://houduan.onrender.com/api' 会变成 'https://houduan.onrender.com'
      const backendRootUrl = baseApiUrl.endsWith('/api') ? baseApiUrl.slice(0, -4) : baseApiUrl;
      
      // 3. 构建一个指向书籍文件接口的【完整绝对URL】
      const bookUrl = `${backendRootUrl}/api/books/${bookId}/file`;
      
      console.log("正在尝试从以下URL加载书籍:", bookUrl); // 增加这行日志，方便您在浏览器控制台确认

      // --- ^^^^  修改到这里结束 ^^^^ ---

      // 4. 让 Epub.js 使用这个完整的URL来加载
      book = Epub(bookUrl);
      
      if (viewerRef.current) {
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%', height: '100%', flow: "paginated", spread: "auto",
        });

        rendition.on('relocated', (loc) => {
          const percent = book.locations.percentageFromCfi(loc.start.cfi);
          setProgress(Math.round(percent * 100));
        });

        book.ready.then(() => {
          book.navigation.toc.then(tocData => setToc(tocData));
        });

        rendition.display().then(() => {
          setIsLoading(false);
        });
        
        setRendition(rendition);
      }
    } catch (err) {
      console.error("加载Epub时出错:", err); // 增加错误日志
      setError("加载书籍内容失败，请刷新重试。");
      setIsLoading(false);
    }
    
    return () => {
      if (book) {
        book.destroy();
      }
    };
}, [bookId]);

  const goToNextPage = () => rendition?.next();
  const goToPrevPage = () => rendition?.prev();
  
  const onTocClick = (href) => {
    rendition?.display(href);
    setShowToc(false);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNextPage,
    onSwipedRight: goToPrevPage,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  return (
    // [核心] 整个JSX结构和之前的最终版完全一样，不需要改动
    // 唯一的区别是，现在的逻辑是自洽的，能正确运行了
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.200' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '正在加载...'}</Typography>
        <IconButton onClick={() => setShowToc(true)} disabled={toc.length === 0}><MenuIcon /></IconButton>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} {...swipeHandlers}>
        {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        )}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        <Box ref={viewerRef} sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', visibility: isLoading ? 'hidden' : 'visible' }} />
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">
            {progress}%
        </Typography>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      
      <Drawer anchor="right" open={showToc} onClose={() => setShowToc(false)}>
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>目录</Typography>
          <List>
            {toc.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => onTocClick(item.href)}>
                  <ListItemText primary={item.label.trim()} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}

export default Reader;
