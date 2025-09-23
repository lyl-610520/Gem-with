// src/components/Reader.js (最终布局严格受控版 - 阅读器)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Epub from 'epubjs';
import { useSwipeable } from 'react-swipeable';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemButton, ListItemText, Alert
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';

function Reader() {
  const location = useLocation();
  const { epubUrl, title } = location.state || {}; // 从Link state中获取数据
  
  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]); // Table of Contents (目录)
  const [progress, setProgress] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [error, setError] = useState('');
  const viewerRef = useRef(null); // Ref for the rendition container

  useEffect(() => {
    if (!epubUrl) {
      setError("无法加载书籍，未找到书籍文件地址。");
      return;
    }
    
    // [核心] 确保 viewerRef.current 存在再进行渲染
    if (viewerRef.current) {
      const book = Epub(epubUrl);
      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: "paginated", // 明确告诉epubjs要分页
        spread: "auto",
      });

      rendition.on('relocated', (loc) => {
        // [核心] 确保locations加载完成后再计算百分比
        book.ready.then(() => {
            const percent = book.locations.percentageFromCfi(loc.start.cfi);
            setProgress(Math.round(percent * 100));
        });
      });
      
      book.ready.then(() => {
        book.navigation.load().then(nav => setToc(nav.toc));
      });

      rendition.display();
      setRendition(rendition);
      
      // 组件卸载时销毁书籍实例，防止内存泄漏
      return () => {
        book.destroy();
      };
    }
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.200' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '正在加载...'}</Typography>
        <IconButton onClick={() => setShowToc(true)} disabled={toc.length === 0}><MenuIcon /></IconButton>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} {...swipeHandlers}>
        {error && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        {!rendition && !error && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        )}
        <Box ref={viewerRef} sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }} />
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
