// src/components/Reader.js (最终美化版 - 修复加载错误 & 美化UI)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Popover, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar, ListItemAvatar, Divider,
  ListItemButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import NotesIcon from '@mui/icons-material/Notes';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

// ==========================================================
// [UI美化版] 聊天窗口组件
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
    <Paper elevation={12} sx={{
      position: 'fixed', bottom: {xs: 10, sm: 20}, right: {xs: 10, sm: 20}, 
      width: {xs: 'calc(100% - 20px)', sm: 360}, height: {xs: '70vh', sm: 500},
      zIndex: 1300, display: 'flex', flexDirection: 'column', 
      borderRadius: '20px', // 更圆润的边角
      backdropFilter: 'blur(10px)', // 毛玻璃效果
      backgroundColor: 'rgba(255, 255, 255, 0.8)', // 半透明背景
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', // 更柔和的阴影
      overflow: 'hidden'
    }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <Typography variant="h6" sx={{fontWeight: 'bold'}}>与 Gem 伴读</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((msg, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
            {msg.sender === 'gemini' && <Avatar sx={{ bgcolor: 'primary.light', mr: 1, width: 32, height: 32 }}><AutoAwesomeIcon fontSize="small" /></Avatar>}
            <Paper elevation={0} sx={{ 
              p: '10px 14px', 
              borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', // 气泡效果
              bgcolor: msg.sender === 'user' ? 'primary.main' : 'rgba(0,0,0,0.05)', 
              color: msg.sender === 'user' ? 'white' : 'black', 
              maxWidth: '80%' 
            }}>
              <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>{msg.text}</Typography>
            </Paper>
          </Box>
        ))}
        {isSending && <Typography sx={{textAlign: 'center', color: 'text.secondary', fontSize: '0.8rem', my: 1}}>Gem 正在思考...</Typography>}
        <div ref={messagesEndRef} />
      </Box>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 1, display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <InputBase sx={{ ml: 1, flex: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '20px', px: 2, py: 0.5 }} placeholder="问问关于这一页的事..." value={input} onChange={(e) => setInput(e.target.value)} />
        <IconButton type="submit" color="primary" disabled={isSending || !input.trim()}><SendIcon /></IconButton>
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
  const [selectionMenu, setSelectionMenu] = useState({ open: false, anchorEl: null, text: '' });
  const [annotationModal, setAnnotationModal] = useState({ open: false, text: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showToc, setShowToc] = useState(false);

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
          axios.get(`/books/${bookId}`) // 这个API现在已经修复
        ]);
        if (!isMounted) return;
        
        if (detailsResponse.data && Array.isArray(detailsResponse.data.annotations)) {
            setAnnotations(detailsResponse.data.annotations);
        }

        book = Epub(fileResponse.data);
        await book.ready;
        if (!isMounted) return;

        if (viewerRef.current) {
          currentRendition = book.renderTo(viewerRef.current, {
            width: '100%', height: '100%', flow: "paginated", spread: "auto",
          });
          
          await currentRendition.display();
          if (!isMounted) return;

          currentRendition.on('selected', (cfiRange, contents) => {
            const selectedText = contents.window.getSelection().toString().trim();
            if (selectedText) {
              const rect = contents.window.getSelection().getRangeAt(0).getBoundingClientRect();
              const anchor = document.createElement('div');
              anchor.style.position = 'absolute';
              const viewerRect = viewerRef.current.getBoundingClientRect();
              anchor.style.left = `${rect.left - viewerRect.left + rect.width / 2}px`;
              anchor.style.top = `${rect.top - viewerRect.top - 10}px`;

              viewerRef.current.appendChild(anchor);
              setSelectionMenu({ open: true, anchorEl: anchor, text: selectedText });
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

          if (isMounted) { 
            setRendition(currentRendition);
            setToc(book.navigation.toc); 
            setIsLoading(false); 
          }
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
  
  const getCurrentPageContent = async () => {
    if (!rendition) return '';
    const contents = rendition.getContents();
    if (!contents || contents.length === 0) return '';
    return contents.map(content => content.document.body.textContent || '').join('\n');
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
    setAnnotationModal({ open: false, text: '' });
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
      setAnnotations(prev => [...prev, response.data.annotation].sort((a,b) => a.page_number - b.page_number));
      setSnackbar({ open: true, message: 'Gem 写好批注啦！' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Gem 思考失败了' });
    }
  };

  const onTocClick = (href) => { 
    rendition?.display(href);
    setShowToc(false);
  };

  const handleCloseSelectionMenu = () => {
    selectionMenu.anchorEl?.remove();
    setSelectionMenu({ open: false, anchorEl: null, text: '' });
  };
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
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
            <IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading ? 'hidden' : 'visible' }} />

        {!isLoading && !error && (
          <>
            <Box onClick={() => rendition?.prev()} sx={{ position: 'absolute', left: 0, width: '40%', height: '100%', zIndex: 1 }} />
            <Box onClick={() => rendition?.next()} sx={{ position: 'absolute', right: 0, width: '40%', height: '100%', zIndex: 1 }} />
          </>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">{progress}%</Typography>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      
      <Popover open={selectionMenu.open} anchorEl={selectionMenu.anchorEl} onClose={handleCloseSelectionMenu}>
        <Paper sx={{p: 1}}>
          <Button onClick={() => {
            setAnnotationModal({ open: true, text: selectionMenu.text });
            handleCloseSelectionMenu();
          }}>添加批注</Button>
        </Paper>
      </Popover>
      
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ ...annotationModal, open: false })}>
        <Box p={2}>
          <Typography variant="h6" noWrap>为 “{annotationModal.text}” 添加批注</Typography>
          <TextField
            autoFocus margin="dense" label="你的想法..." type="text" fullWidth variant="standard"
            onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { handleSaveAnnotation(e.target.value); } }}
          />
        </Box>
      </Drawer>

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
