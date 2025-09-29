// src/components/Reader.js (终极完整修复版)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar,
  ListItemButton, Popover,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import NotesIcon from '@mui/icons-material/Notes';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CreateIcon from '@mui/icons-material/Create';

// GeminiChat 组件 (保持完整，不省略)
function GeminiChat({ open, onClose, onSendMessage, messages, isSending }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const handleSend = () => { if (input.trim()) { onSendMessage(input.trim()); setInput(''); } };
  if (!open) return null;
  return (
    <Paper elevation={12} sx={{ position: 'fixed', bottom: {xs: 10, sm: 20}, right: {xs: 10, sm: 20}, width: {xs: 'calc(100% - 20px)', sm: 360}, height: {xs: '70vh', sm: 500}, zIndex: 1300, display: 'flex', flexDirection: 'column', borderRadius: '20px', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)' }}><Typography variant="h6" sx={{fontWeight: 'bold'}}>与 Gem 伴读</Typography><IconButton onClick={onClose} size="small"><CloseIcon /></IconButton></Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((msg, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
            {msg.sender === 'gemini' && <Avatar sx={{ bgcolor: 'primary.light', mr: 1, width: 32, height: 32 }}><AutoAwesomeIcon fontSize="small" /></Avatar>}
            <Paper elevation={0} sx={{ p: '10px 14px', borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', bgcolor: msg.sender === 'user' ? 'primary.main' : 'rgba(0,0,0,0.05)', color: msg.sender === 'user' ? 'white' : 'black', maxWidth: '80%' }}><Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>{msg.text}</Typography></Paper>
          </Box>
        ))}
        {isSending && <Typography sx={{textAlign: 'center', color: 'text.secondary', fontSize: '0.8rem', my: 1}}>Gem 正在思考...</Typography>}
        <div ref={messagesEndRef} />
      </Box>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 1, display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)' }}><InputBase sx={{ ml: 1, flex: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '20px', px: 2, py: 0.5 }} placeholder="问问关于这一页的事..." value={input} onChange={(e) => setInput(e.target.value)} /><IconButton type="submit" color="primary" disabled={isSending || !input.trim()}><SendIcon /></IconButton></Box>
    </Paper>
  );
}

function Reader() {
  const { bookId } = useParams();
  
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const viewerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookTitle, setBookTitle] = useState('加载中...');
  const [toc, setToc] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  
  const [location, setLocation] = useState({
      progress: 0,
      currentChapter: '加载中...'
  });

  const [selectionPopover, setSelectionPopover] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState({ text: '', cfi: '' });
  const [annotationModal, setAnnotationModal] = useState({ open: false });

  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  
  // [修复] 抽离出独立的绘制高亮函数，以便复用
  const drawHighlight = useCallback((annotation) => {
    if (!renditionRef.current || !annotation.cfi) return;
    const isGemini = annotation.is_gemini_annotation;
    // 为不同类型的批注分配不同的 CSS 类名，方便管理
    const className = isGemini ? 'gemini-highlight' : 'user-highlight';
    renditionRef.current.annotations.add("highlight", annotation.cfi, {}, () => {}, className, {});
  }, []);

  const getCurrentPageText = useCallback(() => {
    if (!renditionRef.current) return "";
    const contents = renditionRef.current.getContents();
    if (contents.length > 0 && contents[0].document) {
      return contents[0].document.body.innerText;
    }
    return "";
  }, []);
  
  const fetchAndDrawAnnotations = useCallback(async () => {
    if (!bookId) return;
    try {
      const response = await axios.get(`/books/${bookId}`); // [修正] API 路径
      const loadedAnnotations = response.data.annotations || [];
      setAnnotations(loadedAnnotations);
      
      if (renditionRef.current && renditionRef.current.getContents()) {
        renditionRef.current.annotations.removeall();
        loadedAnnotations.forEach(anno => {
          drawHighlight(anno); // 使用新的绘制函数
        });
      }
    } catch (err) {
      console.error("获取批注失败:", err);
      setSnackbar({ open: true, message: '无法加载批注' });
    }
  }, [bookId, drawHighlight]);

  useEffect(() => {
    let isMounted = true;
    if (!bookId) {
      setError("未找到书籍ID");
      setIsLoading(false);
      return;
    }

    const loadBook = async () => {
      try {
        setIsLoading(true); setError('');

        const fileResponse = await axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer' }); // [修正] API 路径
        if (!isMounted) return;

        bookRef.current = Epub(fileResponse.data);
        await bookRef.current.ready;
        if (!isMounted) return;

        const meta = await bookRef.current.loaded.metadata;
        if (isMounted) {
            setBookTitle(meta.title);
            setToc(bookRef.current.navigation.toc);
        }

        if (viewerRef.current) {
          renditionRef.current = bookRef.current.renderTo(viewerRef.current, { 
            width: '100%', 
            height: '100%',
            allowScriptedContent: true,
            manager: "continuous",
            flow: "paginated",
          });

          // [修复] 注入CSS，从根源上解决高亮不显示问题
          renditionRef.current.themes.register("custom", {
            "rules": {
              // 用户批注的样式
              ".user-highlight": {
                "fill": "rgba(255, 255, 0, 0.4) !important",
                "stroke": "rgba(255, 255, 0, 0.6) !important",
              },
              // Gemini 批注的样式
              ".gemini-highlight": {
                "fill": "rgba(135, 206, 250, 0.4) !important",
                "stroke": "rgba(135, 206, 250, 0.6) !important",
              }
            },
            "body": { 
              "padding": "20px !important", 
              "line-height": "1.7 !important", 
              "font-size": "18px !important",
              "color": "#333 !important",
              "word-wrap": "break-word",
              "-webkit-touch-callout": "none !important",
              "user-select": "none !important",
            },
            "p, span, div": {
              "user-select": "text !important",
            }
          });
          renditionRef.current.themes.select("custom");

          renditionRef.current.on('selected', (cfiRange, contents) => {
            const selection = contents.window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                setTempAnnotation({
                    text: selection.toString().trim(),
                    cfi: cfiRange,
                });

                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const viewerRect = viewerRef.current.getBoundingClientRect();

                setSelectionPopover({
                    rect: {
                        top: rect.top - viewerRect.top,
                        left: rect.left - viewerRect.left,
                        width: rect.width,
                        height: rect.height,
                    },
                });
            }
          });
          
          // [修复] 优化 relocated 逻辑，防止不必要的更新
          let relocationTimer;
          renditionRef.current.on('relocated', (location) => {
            if (!isMounted || !bookRef.current) return;
            
            // 使用防抖（debounce）来避免过于频繁的更新和保存
            clearTimeout(relocationTimer);
            relocationTimer = setTimeout(() => {
                const chapter = bookRef.current.spine.get(location.start.href);
                let currentChapterLabel = '未知章节';
                if (chapter) {
                    const foundTocItem = bookRef.current.navigation.toc.find(item => {
                        const tocHref = item.href.split('#')[0];
                        const chapterHref = chapter.href.split('#')[0];
                        return chapterHref.includes(tocHref);
                    });
                    if (foundTocItem) {
                        currentChapterLabel = foundTocItem.label.trim();
                    }
                }
                setLocation({
                  progress: Math.round(location.start.percentage * 100),
                  currentChapter: currentChapterLabel,
                });
                localStorage.setItem(`book-progress-${bookId}`, location.start.cfi);
            }, 250); // 250毫秒延迟
          });
          
          renditionRef.current.on('displayed', () => {
            if (isMounted) fetchAndDrawAnnotations();
          });

          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          await renditionRef.current.display(savedCfi || undefined);
        }
        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error("加载书籍失败:", err);
        if (isMounted) {
          setError("加载书籍失败，请刷新重试。");
          setIsLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      isMounted = false;
      if (renditionRef.current) renditionRef.current.destroy();
      if (bookRef.current) bookRef.current.destroy();
    };
  }, [bookId, fetchAndDrawAnnotations]);

  const closeSelectionPopover = () => {
    setSelectionPopover(null);
    if (renditionRef.current) {
        renditionRef.current.getContents().forEach(content => {
            if (content.window) {
                content.window.getSelection().removeAllRanges();
            }
        });
    }
  };

  // [修复] 核心修复点：采用“精准添加”模式，彻底解决跳页问题
  const handleSaveAnnotation = async (note) => {
    if (!note.trim()) {
      setSnackbar({ open: true, message: '批注内容不能为空' });
      return;
    }
    try {
      // 1. 发送请求到后端保存
      const response = await axios.post(`/books/${bookId}/annotations`, { // [修正] API 路径
        content: note,
        highlighted_text: tempAnnotation.text,
        cfi: tempAnnotation.cfi,
      });

      // 2. 后端会返回刚刚创建成功的批注对象
      const newAnnotation = response.data.annotation;

      // 3. 直接将新的批注添加到当前视图，而不是刷新全部
      drawHighlight(newAnnotation);
      
      // 4. 更新 React 的 state，让侧边栏列表也同步更新
      setAnnotations(prev => [...prev, newAnnotation]);

      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      console.error("保存批注失败: ", err);
      setSnackbar({ open: true, message: err.response?.data?.error || '保存失败，请检查网络' });
    }
    // 5. 关闭模态框和选择菜单
    setAnnotationModal({ open: false });
    closeSelectionPopover();
  };


  const handleGenerateGeminiAnnotation = async () => {
    setSnackbar({ open: true, message: '正在请求 Gem 为本页生成批注...' });
    closeSelectionPopover(); // 先关闭菜单，避免干扰
    try {
        const currentPageText = getCurrentPageText();
        if (currentPageText.length < 50) {
            setSnackbar({ open: true, message: '当前页内容太少，无法生成批注' });
            return;
        }

        const pageStartCfi = renditionRef.current.currentLocation().start.cfi;
        
        const response = await axios.post(`/books/${bookId}/generate-gemini-annotation`, { // [修正] API 路径
            page_content: currentPageText,
            cfi: pageStartCfi
        });

        if (response.data.success) {
            const newAnnotation = response.data.annotation;
            drawHighlight(newAnnotation); // 精准添加 Gemini 的高亮
            setAnnotations(prev => [...prev, newAnnotation]); // 更新 state
            setSnackbar({ open: true, message: 'Gem 批注已生成并保存' });
        }
    } catch (err) {
        console.error("Gemini annotation generation failed:", err);
        setSnackbar({ open: true, message: err.response?.data?.error || '生成AI批注失败' });
    }
  };

  const handleSendChatMessage = async (message) => {
    setIsChatSending(true);
    setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
    try {
      const page_content = getCurrentPageText();
      const response = await axios.post(`/books/${bookId}/chat`, { message, page_content }); // [修正] API 路径
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: "抱歉，我好像出错了..." }]);
    }
    setIsChatSending(false);
  };

  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm("确定要删除这条批注吗？")) return;
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`); // [修正] API 路径
      setSnackbar({ open: true, message: '批注已删除' });
      // [修复] 从 state 中移除后，直接调用全局刷新，这是最简单的处理删除的方式
      const removedAnnotation = annotations.find(a => a.id === annotationId);
      if(removedAnnotation && renditionRef.current) {
         renditionRef.current.annotations.remove(removedAnnotation.cfi, "highlight");
      }
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    } catch (err) {
      setSnackbar({ open: true, message: '删除失败' });
    }
  };

  const handleNextPage = useCallback(() => { if (!selectionPopover) renditionRef.current?.next(); }, [selectionPopover]);
  const handlePrevPage = useCallback(() => { if (!selectionPopover) renditionRef.current?.prev(); }, [selectionPopover]);
  const onTocClick = (href) => { renditionRef.current?.display(href).then(() => setShowToc(false)); };
  const handleJumpToAnnotation = (cfi) => { renditionRef.current?.display(cfi); setShowAnnotationsPanel(false); };

  const handleKeyPress = useCallback((event) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (event.key === 'ArrowRight') handleNextPage();
    if (event.key === 'ArrowLeft') handlePrevPage();
  }, [handleNextPage, handlePrevPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{bookTitle}</Typography>
        <Box>
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} >
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /><Typography sx={{ml: 2}}>书籍加载中...</Typography></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible' }} />
        
        <Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '25%', height: '100%', zIndex: 10, WebkitTapHighlightColor: 'transparent', cursor: selectionPopover ? 'default' : 'pointer' }} />
        <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '25%', height: '100%', zIndex: 10, WebkitTapHighlightColor: 'transparent', cursor: selectionPopover ? 'default' : 'pointer' }} />
      </Box>

      <Popover
        open={Boolean(selectionPopover)}
        anchorReference="anchorPosition"
        anchorPosition={selectionPopover ? { top: selectionPopover.rect.top + selectionPopover.rect.height + 5, left: selectionPopover.rect.left + selectionPopover.rect.width / 2 } : undefined}
        onClose={closeSelectionPopover}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ pointerEvents: 'none' }}
      >
        <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
          <Button size="small" startIcon={<CreateIcon />} onClick={() => { setAnnotationModal({ open: true }); setSelectionPopover(null); }}>
            批注
          </Button>
          <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateGeminiAnnotation}>
            Gem一下
          </Button>
          <IconButton size="small" onClick={closeSelectionPopover} sx={{ ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Popover>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary" noWrap sx={{px: 2}}>{location.currentChapter}</Typography>
        <LinearProgress variant="determinate" value={location.progress} />
      </Box>
      
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2} component="form" onSubmit={(e) => { e.preventDefault(); handleSaveAnnotation(e.currentTarget.elements.note.value); }}>
          <Typography variant="subtitle1" noWrap sx={{mb: 1}}>为 “{tempAnnotation.text}” 添加批注</Typography>
          <TextField
            name="note" autoFocus margin="dense" label="你的想法..." type="text"
            fullWidth multiline rows={3} variant="outlined"
          />
          <Button type="submit" variant="contained" sx={{mt: 1}}>保存</Button>
        </Box>
      </Drawer>
      
      <Drawer anchor="right" open={showAnnotationsPanel} onClose={() => setShowAnnotationsPanel(false)}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {annotations.length > 0 ? annotations.sort((a,b) => a.cfi.localeCompare(b.cfi)).map((anno) => (
              <ListItem key={anno.id} secondaryAction={ <IconButton edge="end" onClick={() => handleDeleteAnnotation(anno.id)}> <DeleteIcon /> </IconButton> } disablePadding >
                <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                  <ListItemText 
                    primary={anno.highlighted_text} 
                    secondary={anno.content}
                    primaryTypographyProps={{ style: { color: anno.is_gemini_annotation ? 'royalblue' : 'inherit', fontStyle: 'italic', opacity: 0.8 } }}
                  />
                </ListItemButton>
              </ListItem>
            )) : <Typography color="text.secondary">还没有任何批注。</Typography>}
          </List>
        </Box>
      </Drawer>

      <Drawer anchor="right" open={showToc} onClose={() => setShowToc(false)}>
        <Box sx={{ width: {xs: '90vw', sm: 300} }}>
          <Typography variant="h6" sx={{p: 2}}>目录</Typography>
          <List>{toc.map((item, index) => (
              <ListItem key={index} disablePadding><ListItemButton onClick={() => onTocClick(item.href)}><ListItemText primary={item.label.trim()} /></ListItemButton></ListItem>
          ))}</List>
        </Box>
      </Drawer>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 72, right: 16, zIndex: 1200 }} onClick={() => setShowGeminiChat(true)}><ChatIcon /></Fab>
      <GeminiChat open={showGeminiChat} onClose={() => setShowGeminiChat(false)} onSendMessage={handleSendChatMessage} messages={chatMessages} isSending={isChatSending}/>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
