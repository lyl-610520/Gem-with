// src/components/Reader.js (最终修复版 - 补全状态声明)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Popover, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar, ListItemAvatar, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import NotesIcon from '@mui/icons-material/Notes';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

// ==========================================================
// [新增] 聊天窗口组件
// ==========================================================
function GeminiChat({ open, onClose, onSendMessage, messages, isSending }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  if (!open) return null;

  return (
    <Paper elevation={8} sx={{
      position: 'fixed', bottom: 20, right: 20, width: {xs: '90%', sm: 350}, height: 500, zIndex: 1300,
      display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden'
    }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">与 Gem 伴读</Typography>
        <Button color="inherit" onClick={onClose}>关闭</Button>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((msg, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
            {msg.sender === 'gemini' && <Avatar sx={{ bgcolor: 'primary.light', mr: 1 }}><AutoAwesomeIcon /></Avatar>}
            <Paper elevation={2} sx={{ p: 1.5, borderRadius: 3, bgcolor: msg.sender === 'user' ? 'primary.main' : 'grey.200', color: msg.sender === 'user' ? 'white' : 'black', maxWidth: '80%' }}>
              <Typography variant="body1">{msg.text}</Typography>
            </Paper>
          </Box>
        ))}
        {isSending && <Typography sx={{textAlign: 'center', color: 'grey.500'}}>Gem 正在思考...</Typography>}
        <div ref={messagesEndRef} />
      </Box>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 1, display: 'flex', borderTop: '1px solid #ddd' }}>
        <InputBase sx={{ ml: 1, flex: 1 }} placeholder="问问关于这一页的事..." value={input} onChange={(e) => setInput(e.target.value)} />
        <IconButton type="submit" color="primary" disabled={isSending}><SendIcon /></IconButton>
      </Box>
    </Paper>
  );
}

// ==========================================================
// [核心] 阅读器主组件
// ==========================================================
function Reader() {
  const { bookId } = useParams();
  const location = useLocation();
  const { title } = location.state || {};
  
  // --- VVVV  核心状态声明 VVVV ---
  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const viewerRef = useRef(null);
  const [annotations, setAnnotations] = useState([]);
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState({ open: false, anchorEl: null, text: '', cfiRange: null });
  const [annotationModal, setAnnotationModal] = useState({ open: false, text: '', cfiRange: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // --- VVVV  [这是本次最核心的修复] 补回被误删的状态 VVVV ---
  const [showToc, setShowToc] = useState(false);
  // --- ^^^^  修复结束 ^^^^ ---

  useEffect(() => {
    let book;
    let currentRendition;
    let isMounted = true; 

    const handleKeyPress = (event) => {
      if (currentRendition) {
        if (event.key === 'ArrowRight') currentRendition.next();
        if (event.key === 'ArrowLeft') currentRendition.prev();
      }
    };
    window.addEventListener('keydown', handleKeyPress);

    const loadBookAndAnnotations = async () => {
      if (!bookId) {
        if (isMounted) { setError("未找到书籍ID"); setIsLoading(false); }
        return;
      }
      try {
        if (isMounted) { setIsLoading(true); setError(''); }

        const [fileResponse, detailsResponse] = await Promise.all([
          axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer' }),
          axios.get(`/books/${bookId}`)
        ]);
        if (!isMounted) return;
        
        // 检查返回的数据结构是否正确
        if (detailsResponse.data && Array.isArray(detailsResponse.data.annotations)) {
            setAnnotations(detailsResponse.data.annotations);
        } else {
            console.warn("收到的批注数据格式不正确", detailsResponse.data);
            setAnnotations([]);
        }

        book = Epub(fileResponse.data);
        await book.ready;
        if (!isMounted) return;

        if (viewerRef.current) {
          currentRendition = book.renderTo(viewerRef.current, {
            width: '100%', height: '100%', flow: "paginated", spread: "auto",
          });
          setRendition(currentRendition);

          await currentRendition.display();
          if (!isMounted) return;

          currentRendition.on('selected', (cfiRange, contents) => {
            const selectedText = contents.window.getSelection().toString().trim();
            if (selectedText) {
              const rect = contents.window.getSelection().getRangeAt(0).getBoundingClientRect();
              const anchor = document.createElement('div');
              anchor.style.position = 'absolute';
              // 计算相对于viewerRef的位置
              const viewerRect = viewerRef.current.getBoundingClientRect();
              anchor.style.left = `${rect.left - viewerRect.left + rect.width / 2}px`;
              anchor.style.top = `${rect.top - viewerRect.top - 10}px`;

              viewerRef.current.appendChild(anchor);
              setSelectionMenu({ open: true, anchorEl: anchor, text: selectedText, cfiRange });
            }
          });
          
          currentRendition.manager.on('swiped', (e) => {
            if (e.direction === 'left') currentRendition.next();
            if (e.direction === 'right') currentRendition.prev();
          });
          
          currentRendition.on('relocated', (loc) => {
            if (isMounted && book.locations) {
              const percent = book.locations.percentageFromCfi(loc.start.cfi);
              setProgress(Math.round(percent * 100));
            }
          });

          if (isMounted) { setToc(book.navigation.toc); setIsLoading(false); }
        }
      } catch (err) {
        console.error("加载书籍或批注失败:", err);
        if (isMounted) { setError("加载失败，请刷新重试"); setIsLoading(false); }
      }
    };

    loadBookAndAnnotations();
    
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyPress);
      if (currentRendition) currentRendition.destroy();
      if (book) book.destroy();
    };
  }, [bookId]);
  
  // --- 所有交互功能的处理函数 ---
  const getCurrentPageContent = async () => {
      if (!rendition) return '';
      const location = rendition.currentLocation();
      if (!location || !location.start) return '';
      
      const range = location.start.cfi;
      const chapter = await rendition.book.getRange(range);
      
      if(chapter && chapter.startContainer) {
          // 尝试获取整个章节的文本内容
          const chapterNode = chapter.startContainer.ownerDocument.body;
          return chapterNode.textContent || '';
      }
      return '';
  };

  const handleSaveAnnotation = async (note) => {
    try {
      const response = await axios.post(`/books/${bookId}/annotations`, {
        content: note,
        highlighted_text: annotationModal.text,
        page_number: progress,
      });
      setAnnotations(prev => [...prev, response.data.annotation]);
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      setSnackbar({ open: true, message: '保存失败' });
    }
    setAnnotationModal({ open: false, text: '', cfiRange: null });
  };
  
  const handleSendChatMessage = async (message) => {
    setIsChatSending(true);
    setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
    try {
      const pageContent = await getCurrentPageContent();
      const response = await axios.post(`/books/${bookId}/chat`, { message, page_content: pageContent });
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: '抱歉，我暂时无法回答。' }]);
    }
    setIsChatSending(false);
  };
  
  const handleGenerateGeminiAnnotation = async () => {
    setSnackbar({ open: true, message: '正在请 Gem 思考...' });
    try {
      const pageContent = await getCurrentPageContent();
      const response = await axios.post(`/books/${bookId}/generate-gemini-annotation`, {
        page_content: pageContent,
        page_number: progress,
      });
      setAnnotations(prev => [...prev, response.data.annotation]);
      setSnackbar({ open: true, message: 'Gem 写好批注啦！' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Gem 思考失败了' });
    }
  };

  const onTocClick = (href) => { 
    rendition?.display(href);
    setShowToc(false); // <--- 这里需要 setShowToc
  };

  const handleCloseSelectionMenu = () => {
    selectionMenu.anchorEl?.remove();
    setSelectionMenu({ open: false, anchorEl: null, text: '', cfiRange: null });
  };
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.200' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '...'}</Typography>
        <Box>
          <Tooltip title="Gem写了什么">
            <IconButton onClick={handleGenerateGeminiAnnotation}><VisibilityIcon /></IconButton>
          </Tooltip>
          <Tooltip title="批注列表">
            <IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton>
          </Tooltip>
          <Tooltip title="目录">
            <IconButton onClick={() => setShowToc(true)} disabled={toc.length === 0}><MenuIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading ? 'hidden' : 'visible' }} />

        {!isLoading && !error && (
          <>
            <Box onClick={() => rendition?.prev()} sx={{ position: 'absolute', left: 0, width: '50%', height: '100%', zIndex: 1 }} />
            <Box onClick={() => rendition?.next()} sx={{ position: 'absolute', right: 0, width: '50%', height: '100%', zIndex: 1 }} />
          </>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">{progress}%</Typography>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      
      {/* 文本选择后的弹出菜单 */}
      <Popover open={selectionMenu.open} anchorEl={selectionMenu.anchorEl} onClose={handleCloseSelectionMenu}>
        <Paper sx={{p: 1}}>
          <Button onClick={() => {
            setAnnotationModal({ open: true, text: selectionMenu.text, cfiRange: selectionMenu.cfiRange });
            handleCloseSelectionMenu();
          }}>添加批注</Button>
        </Paper>
      </Popover>
      
      {/* 添加批注的输入对话框 */}
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ ...annotationModal, open: false })}>
        <Box p={2}>
          <Typography variant="h6">为“{annotationModal.text}”添加批注</Typography>
          <TextField
            autoFocus
            margin="dense"
            label="你的想法..."
            type="text"
            fullWidth
            variant="standard"
            onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { handleSaveAnnotation(e.target.value); } }}
          />
        </Box>
      </Drawer>

      {/* 批注列表面板 */}
      <Drawer anchor="right" open={showAnnotationsPanel} onClose={() => setShowAnnotationsPanel(false)}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {annotations && annotations.length > 0 ? annotations.map((anno) => (
              <React.Fragment key={anno.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: anno.is_gemini_annotation ? 'primary.light' : 'secondary.light' }}>
                      {anno.is_gemini_annotation ? <AutoAwesomeIcon /> : 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={anno.content}
                    secondary={`—— 第 ${anno.page_number}% 处`}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            )) : <Typography sx={{p: 2, color: 'text.secondary'}}>还没有任何批注</Typography>}
          </List>
        </Box>
      </Drawer>

      {/* 目录面板 */}
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
      
      {/* Gemini聊天悬浮按钮和窗口 */}
      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1200 }} onClick={() => setShowGeminiChat(true)}>
        <ChatIcon />
      </Fab>
      <GeminiChat 
        open={showGeminiChat} 
        onClose={() => setShowGeminiChat(false)} 
        onSendMessage={handleSendChatMessage} 
        messages={chatMessages}
        isSending={isChatSending}
      />
      
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
