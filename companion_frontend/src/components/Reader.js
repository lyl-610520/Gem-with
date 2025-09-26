// src/components/Reader.js (最终功能完整版 - 修复翻页)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
// [核心修改] 我们不再需要 useSwipeable 了
// import { useSwipeable } from 'react-swipeable'; 
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

    const loadBook = async () => {
      if (!bookId) {
        setError("无法加载书籍，未找到书籍ID。");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const response = await axios.get(`/books/${bookId}/file`, {
          responseType: 'arraybuffer',
        });

        book = Epub(response.data);
        await book.ready;

        if (viewerRef.current) {
          currentRendition = book.renderTo(viewerRef.current, {
            width: '100%', height: '100%', flow: "paginated", spread: "auto",
          });
          setRendition(currentRendition);

          // --- VVVV  这是本次最核心的修复 VVVV ---

          // 步骤1: 使用 Epub.js 内置的 'swiped' 事件监听器
          currentRendition.on('swiped', (direction) => {
            if (direction === 'left') {
              // 向左滑动 -> 下一页
              currentRendition.next();
            }
            if (direction === 'right') {
              // 向右滑动 -> 上一页
              currentRendition.prev();
            }
          });
          
          // --- ^^^^ 修复结束 ^^^^ ---

          currentRendition.on('relocated', (loc) => {
            if (book.locations) {
                const percent = book.locations.percentageFromCfi(loc.start.cfi);
                setProgress(Math.round(percent * 100));
            }
          });
          
          setToc(book.navigation.toc);
          await currentRendition.display();
          setIsLoading(false);
        }
      } catch (err) {
        console.error("加载或渲染书籍时出错:", err);
        setError("加载书籍内容失败。文件可能已损坏或格式不受支持。");
        setIsLoading(false);
      }
    };

    loadBook();
    
    return () => {
      if (book) book.destroy();
      if (currentRendition) currentRendition.destroy();
    };
  }, [bookId]);

  // [核心修改] 我们不再需要这些外部的翻页函数了，但可以保留给未来的按钮使用
  const goToNextPage = () => rendition?.next();
  const goToPrevPage = () => rendition?.prev();
  
  const onTocClick = (href) => {
    rendition?.display(href);
    setShowToc(false);
  };

  // [核心修改] 移除 useSwipeable hook
  /* 
  const swipeHandlers = useSwipeable({ ... });
  */
  
  // 在JSX中，只需要移除 {...swipeHandlers}
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.200' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '正在加载...'}</Typography>
        <IconButton onClick={() => setShowToc(true)} disabled={toc.length === 0}><MenuIcon /></IconButton>
      </Box>

      {/* [核心修改] 这里的Box不再需要 {...swipeHandlers} */}
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
