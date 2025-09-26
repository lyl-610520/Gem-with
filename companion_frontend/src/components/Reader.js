// src/components/Reader.js (最终、正确的异步逻辑修复版)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import { useSwipeable } from 'react-swipeable';
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

        // 步骤 1: 成功下载书籍文件 (这部分已经验证是正确的)
        const response = await axios.get(`/books/${bookId}/file`, {
          responseType: 'arraybuffer',
        });

        book = Epub(response.data);

        // --- VVVV  这是本次最核心的修复 VVVV ---

        // 步骤 2: 【强制等待】书本元数据和所有资源解析完成
        // book.ready 是一个Promise，必须await它！
        await book.ready;

        // --- ^^^^ 修复结束 ^^^^ ---

        if (viewerRef.current) {
          // 步骤 3: 在书本完全准备好之后，才开始渲染
          currentRendition = book.renderTo(viewerRef.current, {
            width: '100%', height: '100%', flow: "paginated", spread: "auto",
          });
          setRendition(currentRendition); // 先设置到state，翻页才能用

          currentRendition.on('relocated', (loc) => {
            if (book.locations) {
                const percent = book.locations.percentageFromCfi(loc.start.cfi);
                setProgress(Math.round(percent * 100));
            }
          });
          
          setToc(book.navigation.toc);
          
          // 步骤 4: 显示第一页
          await currentRendition.display();

          // 步骤 5: 在一切都成功显示后，才关闭加载动画
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
      if (book) {
        book.destroy();
      }
      if (currentRendition) {
        currentRendition.destroy();
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
  
  // JSX部分保持不变
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
