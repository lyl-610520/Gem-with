// src/components/Reader.js (由 epub.js 驱动的全新版本)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Epub from 'epubjs';
import { useSwipeable } from 'react-swipeable';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemButton, ListItemText
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';

function Reader() {
  const location = useLocation();
  const { epubUrl, title } = location.state || {}; // 从Link state中获取数据
  
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]); // Table of Contents (目录)
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showToc, setShowToc] = useState(false);
  const viewerRef = useRef(null);

  // 初始化和加载书籍
  useEffect(() => {
    if (epubUrl) {
      const epubBook = Epub(epubUrl);
      setBook(epubBook);

      const epubRendition = epubBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'auto', // 自动判断单页还是双页
      });
      
      setRendition(epubRendition);
      
      // 监听位置变化，用于更新进度条和页码
      epubRendition.on('relocated', (loc) => {
        setCurrentLocation(loc);
      });

      // 加载目录
      epubBook.ready.then(() => {
        epubBook.navigation.load().then(nav => setToc(nav.toc));
      });
      
      epubRendition.display();
    }
    // 组件卸载时销毁书籍实例，防止内存泄漏
    return () => {
        book?.destroy();
    };
  }, [epubUrl]);

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

  const progress = currentLocation ? Math.round((currentLocation.start.cfi ? book.locations.percentageFromCfi(currentLocation.start.cfi) : 0) * 100) : 0;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#e8e8e8' }}>
      {/* 顶部工具栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold'}}>{title}</Typography>
        <IconButton onClick={() => setShowToc(true)}><MenuIcon /></IconButton>
      </Box>

      {/* 阅读器核心视图 */}
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        {!rendition && <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%' }} />}
        <Box {...swipeHandlers} ref={viewerRef} sx={{ height: '100%', width: '100%' }} />
        {/* 透明的翻页点击区域 (可选，增强体验) */}
        <Box onClick={goToPrevPage} sx={{position: 'absolute', left: 0, top: 0, height: '100%', width: '20%'}} />
        <Box onClick={goToNextPage} sx={{position: 'absolute', right: 0, top: 0, height: '100%', width: '20%'}} />
      </Box>

      {/* 底部进度条 */}
      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">
            {progress}%
        </Typography>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      
      {/* 目录抽屉 */}
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
