import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar,
  ListItemButton,
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

// GeminiChat 组件 (这部分无需修改，保持原样)
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
      position: 'fixed', 
      bottom: {xs: 10, sm: 20}, 
      right: {xs: 10, sm: 20}, 
      width: {xs: 'calc(100% - 20px)', sm: 360}, 
      height: {xs: '70vh', sm: 500}, 
      zIndex: 1300, 
      display: 'flex', 
      flexDirection: 'column', 
      borderRadius: '20px', 
      backdropFilter: 'blur(10px)', 
      backgroundColor: 'rgba(255, 255, 255, 0.8)', 
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', 
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
              borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', 
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
        <InputBase 
          sx={{ ml: 1, flex: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '20px', px: 2, py: 0.5 }} 
          placeholder="问问关于这一页的事..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
        />
        <IconButton type="submit" color="primary" disabled={isSending || !input.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

function Reader() {
  const { bookId } = useParams();

  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const viewerRef = useRef(null);
  const touchState = useRef({ startX: 0, currentX: 0, isSwiping: false });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookDetails, setBookDetails] = useState({ title: '加载中...', toc: [] });
  const [annotations, setAnnotations] = useState([]);
  const [location, setLocation] = useState({ progress: 0, currentChapter: '加载中...' });
  const [isRenditionReady, setIsRenditionReady] = useState(false);

  const [selectionMenu, setSelectionMenu] = useState(null);
  const [annotationModal, setAnnotationModal] = useState({ open: false, cfi: '', text: '' });
  const [activePanels, setActivePanels] = useState({ toc: false, annotations: false, chat: false });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadBook() {
      // 每次加载新书，都重置所有状态，防止旧书数据污染
      setIsLoading(true);
      setError('');
      setAnnotations([]);
      setBookDetails({ title: '加载中...', toc: [] });
      setIsRenditionReady(false);

      if (!bookId) {
        setError("未找到书籍ID");
        setIsLoading(false);
        return;
      }

      try {
        const [detailsRes, fileRes] = await Promise.all([
          axios.get(`/books/${bookId}`, { signal: abortController.signal }),
          axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer', signal: abortController.signal })
        ]);

        const book = Epub(fileRes.data);
        bookRef.current = book;
        await book.ready;

        const meta = await book.loaded.metadata;
        setBookDetails({ title: meta.title, toc: book.navigation.toc });
        setAnnotations(detailsRes.data.annotations || []);

        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            manager: "default", flow: "paginated", width: '100%', height: '100%',
          });
          renditionRef.current = rendition;

          rendition.themes.register("custom", {
            "rules": {
              ".user-highlight": { "fill": "rgba(255, 255, 0, 0.4) !important", "fill-opacity": "1" },
              ".gemini-highlight": { "fill": "rgba(135, 206, 250, 0.4) !important", "fill-opacity": "1" },
            },
            body: {
              "padding": "20px !important", "line-height": "1.7 !important", "font-size": "18px !important",
              "color": "#333 !important", "word-wrap": "break-word",
            },
          });
          rendition.themes.select("custom");

          rendition.on('displayed', () => setIsRenditionReady(true));
          rendition.on('displayError', (err) => {
            console.error("Epub.js 显示错误:", err);
            setError("渲染书籍页面失败，文件可能已损坏。");
            setIsRenditionReady(false);
          });

          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          await rendition.display(savedCfi || undefined);
        }
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error("加载书籍时发生严重错误:", err);
          setError("加载书籍失败, 文件可能已损坏或网络错误。");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadBook();

    return () => {
      // 这是最关键的清理函数，确保切换书籍或离开页面时，所有旧资源都被销毁
      abortController.abort();
      if (renditionRef.current) {
        renditionRef.current.destroy();
        renditionRef.current = null;
      }
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
      }
      setIsRenditionReady(false);
    };
  }, [bookId]);

  useEffect(() => {
    // 增加最严格的检查，确保rendition和它的内部模块都准备好了
    if (!isRenditionReady || !renditionRef.current || !renditionRef.current.annotations) {
      return;
    }
    const rendition = renditionRef.current;
    
    // 清除旧高亮
    rendition.annotations.each(anno => rendition.annotations.remove(anno.cfiRange, 'highlight'));
    
    // 绘制新高亮
    annotations.forEach(anno => {
      if (anno.cfi) {
        const className = anno.is_gemini_annotation ? 'gemini-highlight' : 'user-highlight';
        rendition.annotations.add("highlight", anno.cfi, { id: anno.id }, () => {}, className, {});
      }
    });
  }, [annotations, isRenditionReady]);


  const handleSelection = useCallback((cfiRange, contents) => {
    const selection = contents.window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionMenu({
      top: rect.bottom + 5,
      left: rect.left + (rect.width / 2),
      cfi: cfiRange,
      text: selectedText,
    });
  }, []);

  const handleRelocated = useCallback((locationInfo) => {
    if (!bookRef.current || !bookRef.current.spine) return;

    const chapter = bookRef.current.spine.get(locationInfo.start.href);
    let chapterLabel = '未知章节';
    if (chapter) {
      const tocItem = bookRef.current.navigation.toc.find(item => chapter.href.includes(item.href.split('#')[0]));
      if (tocItem) chapterLabel = tocItem.label.trim();
    }
    
    setLocation({
      progress: Math.round(locationInfo.start.percentage * 100),
      currentChapter: chapterLabel,
    });
    localStorage.setItem(`book-progress-${bookId}`, locationInfo.start.cfi);
  }, [bookId]);

  useEffect(() => {
    if (!isRenditionReady || !renditionRef.current) return;
    const rendition = renditionRef.current;
    
    rendition.on('selected', handleSelection);
    rendition.on('relocated', handleRelocated);
    
    return () => {
      if (renditionRef.current) {
        renditionRef.current.off('selected', handleSelection);
        renditionRef.current.off('relocated', handleRelocated);
      }
    };
  }, [isRenditionReady, handleSelection, handleRelocated]);

  const handleTouchStart = useCallback((e) => {
      touchState.current = { startX: e.touches[0].clientX, currentX: e.touches[0].clientX, isSwiping: true };
  }, []);
  const handleTouchMove = useCallback((e) => {
      if (!touchState.current.isSwiping) return;
      touchState.current.currentX = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(() => {
      if (!touchState.current.isSwiping) return;
      const deltaX = touchState.current.currentX - touchState.current.startX;
      if (Math.abs(deltaX) > 50 && renditionRef.current) {
          if (deltaX < 0) renditionRef.current.next();
          else renditionRef.current.prev();
      }
      touchState.current.isSwiping = false;
  }, []);
  useEffect(() => {
      if (!isRenditionReady || !renditionRef.current) return;
      const rendition = renditionRef.current;
      const setupListeners = (view) => {
          view.document.addEventListener('touchstart', handleTouchStart, { passive: true });
          view.document.addEventListener('touchmove', handleTouchMove, { passive: true });
          view.document.addEventListener('touchend', handleTouchEnd, { passive: true });
      };
      const removeListeners = (view) => {
          view.document.removeEventListener('touchstart', handleTouchStart);
          view.document.removeEventListener('touchmove', handleTouchMove);
          view.document.removeEventListener('touchend', handleTouchEnd);
      };
      rendition.on('rendered', setupListeners);
      rendition.on('viewDetached', removeListeners);
      return () => {
          rendition.off('rendered', setupListeners);
          rendition.off('viewDetached', removeListeners);
      };
  }, [isRenditionReady, handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  const handleKeyPress = useCallback((event) => {
      if (annotationModal.open || activePanels.chat || activePanels.annotations || activePanels.toc) return;
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
      if (event.key === 'ArrowRight' && renditionRef.current) renditionRef.current.next();
      if (event.key === 'ArrowLeft' && renditionRef.current) renditionRef.current.prev();
  }, [annotationModal.open, activePanels]);
  useEffect(() => {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const closeSelectionMenu = useCallback(() => {
    setSelectionMenu(null);
    if (renditionRef.current) {
        renditionRef.current.getContents().forEach(content => {
            content.window.getSelection()?.removeAllRanges();
        });
    }
  }, []);

  const handleSaveAnnotation = async (note) => {
    if (!note.trim() || !annotationModal.cfi) return;
    try {
      const response = await axios.post(`/books/${bookId}/annotations`, {
        content: note, highlighted_text: annotationModal.text, cfi: annotationModal.cfi,
      });
      setAnnotations(prev => [...prev, response.data.annotation]);
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '保存失败' });
    }
    setAnnotationModal({ open: false, cfi: '', text: '' });
  };
  
  const handleGenerateGeminiAnnotation = useCallback(async () => {
    if (!renditionRef.current) return;
    const pageText = renditionRef.current.getContents()[0].document.body.innerText;
    if (pageText.length < 50) {
      setSnackbar({ open: true, message: '当前页内容太少,无法生成批注' });
      return;
    }
    const pageStartCfi = renditionRef.current.currentLocation().start.cfi;
    setSnackbar({ open: true, message: '正在请求 Gem 生成批注...' });
    closeSelectionMenu();

    try {
      const response = await axios.post(`/books/${bookId}/generate-gemini-annotation`, {
        page_content: pageText, cfi: pageStartCfi
      });
      if (response.data.success) {
        setAnnotations(prev => [...prev, response.data.annotation]);
        setSnackbar({ open: true, message: 'Gem 批注已生成' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '生成AI批注失败' });
    }
  }, [bookId, closeSelectionMenu]);
  
  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm("确定要删除这条批注吗?")) return;
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      setSnackbar({ open: true, message: '批注已删除' });
    } catch (err) {
      setSnackbar({ open: true, message: '删除失败' });
    }
  };

  const handleSendChatMessage = async (message) => {
    if (!renditionRef.current) return;
    setIsChatSending(true);
    setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
    try {
      const page_content = renditionRef.current.getContents()[0].document.body.innerText;
      const response = await axios.post(`/books/${bookId}/chat`, { message, page_content });
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: "抱歉,我好像出错了..." }]);
    }
    setIsChatSending(false);
  };

  const onTocClick = (href) => { renditionRef.current?.display(href).then(() => setActivePanels(p => ({...p, toc: false}))) };
  const handleJumpToAnnotation = (cfi) => { renditionRef.current?.display(cfi).then(() => setActivePanels(p => ({...p, annotations: false}))) };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{bookDetails.title}</Typography>
        <Box>
          <Tooltip title="批注列表"><IconButton onClick={() => setActivePanels(p => ({...p, annotations: true}))}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setActivePanels(p => ({...p, toc: true}))} disabled={!bookDetails.toc || bookDetails.toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) closeSelectionMenu(); }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /><Typography sx={{ml: 2}}>书籍加载中...</Typography></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible' }} />

        {selectionMenu && (
          <Paper sx={{ position: 'fixed', top: selectionMenu.top, left: selectionMenu.left, transform: 'translateX(-50%)', zIndex: 1400, display: 'flex', gap: 0.5 }}>
            <Button size="small" startIcon={<CreateIcon />} onClick={() => { setAnnotationModal({ open: true, cfi: selectionMenu.cfi, text: selectionMenu.text }); closeSelectionMenu(); }}>批注</Button>
            <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateGeminiAnnotation}>Gem一下</Button>
            <IconButton size="small" onClick={closeSelectionMenu}><CloseIcon fontSize="small" /></IconButton>
          </Paper>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary" noWrap sx={{px: 2}}>{location.currentChapter}</Typography>
        <LinearProgress variant="determinate" value={location.progress} />
      </Box>
      
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false, text: '', cfi: '' })}>
        <Box p={2} component="form" onSubmit={(e) => { e.preventDefault(); handleSaveAnnotation(e.currentTarget.elements.note.value); }}>
          <Typography variant="subtitle1" noWrap sx={{mb: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>为 “{annotationModal.text}” 添加批注</Typography>
          <TextField name="note" autoFocus margin="dense" label="你的想法..." type="text" fullWidth multiline rows={3} variant="outlined" />
          <Button type="submit" variant="contained" sx={{mt: 1}}>保存</Button>
        </Box>
      </Drawer>
      
      <Drawer anchor="right" open={activePanels.annotations} onClose={() => setActivePanels(p => ({...p, annotations: false}))}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {annotations.length > 0 ? (
              [...annotations].sort((a,b) => a.cfi.localeCompare(b.cfi, undefined, { numeric: true })).map((anno) => (
                  <ListItem key={anno.id} secondaryAction={ <IconButton edge="end" onClick={() => handleDeleteAnnotation(anno.id)}> <DeleteIcon /> </IconButton> } disablePadding >
                    <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                      <ListItemText 
                        primary={anno.highlighted_text} 
                        secondary={anno.content}
                        primaryTypographyProps={{ style: { color: anno.is_gemini_annotation ? 'royalblue' : 'inherit', fontStyle: 'italic', opacity: 0.8, marginBottom: '4px' } }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
            ) : <Typography color="text.secondary">还没有任何批注。</Typography>}
          </List>
        </Box>
      </Drawer>

      <Drawer anchor="right" open={activePanels.toc} onClose={() => setActivePanels(p => ({...p, toc: false}))}>
        <Box sx={{ width: {xs: '90vw', sm: 300} }}>
          <Typography variant="h6" sx={{p: 2}}>目录</Typography>
          <List>{bookDetails.toc.map((item, index) => (
              <ListItem key={index} disablePadding><ListItemButton onClick={() => onTocClick(item.href)}><ListItemText primary={item.label.trim()} /></ListItemButton></ListItem>
          ))}</List>
        </Box>
      </Drawer>

      <Fab color="primary" sx={{ position: 'fixed', bottom: 72, right: 16, zIndex: 1200 }} onClick={() => setActivePanels(p => ({...p, chat: true}))}><ChatIcon /></Fab>
      <GeminiChat open={activePanels.chat} onClose={() => setActivePanels(p => ({...p, chat: false}))} onSendMessage={handleSendChatMessage} messages={chatMessages} isSending={isChatSending}/>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
