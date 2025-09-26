// src/components/Reader.js (最终修复版 - 修正语法错误和逻辑)

import React, { useState, useEffect, useRef } from 'react'; // <--- 修复了此处的语法错误
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
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

  useEffect(() => {
    let book;
    let currentRendition;
    let isMounted = true; 

    const loadBook = async () => {
      if (!bookId) {
        if (isMounted) {
          setError("无法加载书籍，未找到书籍ID。");
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
          setError('');
        }

        const response = await axios.get(`/books/${bookId}/file`, {
          responseType: 'arraybuffer',
        });
        if (!isMounted) return;

        book = Epub(response.data);
        await book.ready;
        if (!isMounted) return;

        if (viewerRef.current) {
          currentRendition = book.renderTo(viewerRef.current, {
            width: '100%', height: '100%', flow: "paginated", spread: "auto",
          });

          // 步骤 1: 必须先调用 display() 来创建 iframe 和管理器
          await currentRendition.display();
          if (!isMounted) return;

          // 步骤 2: 在 display 完成后，manager 才存在，此时才能安全地绑定事件
          currentRendition.manager.on('swiped', (e) => {
            if (e.direction === 'left') currentRendition.next();
            if (e.direction === 'right') currentRendition.prev();
          });

          currentRendition.on('keyup', (event) => {
            if (event.key === 'ArrowRight') currentRendition.next();
            if (event.key === 'ArrowLeft') currentRendition.prev();
          });

          currentRendition.on('relocated', (loc) => {
            if (isMounted && book.locations) {
              const percent = book.locations.percentageFromCfi(loc.start.cfi);
              setProgress(Math.round(percent * 100));
            }
          });

          if (isMounted) {
            setRendition(currentRendition);
            setToc(book.navigation.toc);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("加载或渲染书籍时出错:", err);
        if (isMounted) {
          setError("加载书籍内容失败。文件可能已损坏或格式不受支持。");
          setIsLoading(false);
        }
      }
    };

    loadBook();
    
    return () => {
      isMounted = false;
      if (currentRendition) currentRendition.destroy();
      if (book) book.destroy();
    };
  }, [bookId]);

  const onTocClick = (href) => {
    rendition?.display(href);
    setShowToc(false);
  };
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.200' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '正在加载...'}</Typography>
        <IconButton onClick={() => setShowToc(true)} disabled={toc.length === 0}><MenuIcon /></IconButton>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
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
