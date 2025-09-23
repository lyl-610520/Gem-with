// src/components/Reader.js (最终Base64版 - 完整代码)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import { useSwipeable } from 'react-swipeable';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemButton, ListItemText, Alert
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';

function Reader() {
  const { bookId } = useParams(); // 从URL中获取书籍ID
  const location = useLocation();
  const { title } = location.state || {}; // 从书架页接收书名

  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true); // [新增] 统一的加载状态
  const viewerRef = useRef(null);

  useEffect(() => {
    let book; // 把 book 实例放在 effect 作用域内，方便在卸载时销毁
    
    const loadBook = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // 1. 先去请求书籍的Base64内容
        const response = await axios.get(`/books/${bookId}/content`);
        const base64Data = response.data.epub_data_base64;
        
        if (!base64Data) {
          setError("这本书没有内容。");
          setIsLoading(false);
          return;
        }

        // 2. epub.js 可以直接加载Base64数据！
        book = Epub(`data:application/epub+zip;base64,${base64Data}`);
        
        // 3. 确保渲染容器已经准备好
        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: "paginated",
            spread: "auto",
          });

          rendition.on('relocated', (loc) => {
            book.ready.then(() => {
                const percent = book.locations.percentageFromCfi(loc.start.cfi);
                setProgress(Math.round(percent * 100));
            });
          });
          
          book.ready.then(() => {
            book.navigation.load().then(nav => setToc(nav.toc));
          });

          await rendition.display();
          setRendition(rendition);
          setIsLoading(false); // [核心] 渲染完成后才停止加载
        }
      } catch (err) {
        setError("加载书籍内容失败，请刷新重试。");
        setIsLoading(false);
      }
    };
    
    loadBook();
    
    // 4. 组件卸载时销毁书籍实例，防止内存泄漏
    return () => {
      book?.destroy();
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
