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

// GeminiChat 组件 (保持原样)
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
  
  const drawHighlight = useCallback((annotation) => {
    if (!renditionRef.current || !annotation.cfi) return;
    const isGemini = annotation.is_gemini_annotation;
    const className = isGemini ? 'gemini-highlight' : 'user-highlight';
    renditionRef.current.annotations.add("highlight", annotation.cfi, { id: annotation.id }, (e) => {}, className, {});
  }, []);

  const getCurrentPageText = useCallback(() => {
    if (!renditionRef.current) return "";
    const contents = renditionRef.current.getContents();
    if (contents.length > 0 && contents[0].document) {
      return contents[0].document.body.innerText;
    }
    return "";
  }, []);
  
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

        const [fileResponse, detailsResponse] = await Promise.all([
            axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer' }),
            axios.get(`/books/${bookId}`)
        ]);

        if (!isMounted) return;

        const loadedAnnotations = detailsResponse.data.annotations || [];
        setAnnotations(loadedAnnotations);

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
            manager: "default",
            flow: "paginated",
            width: '100%', 
            height: '100%',
            allowScriptedContent: true,
          });

          renditionRef.current.themes.register("custom", {
            "rules": {
              ".user-highlight": { "fill": "rgba(255, 255, 0, 0.4) !important", "fill-opacity": "1", "mix-blend-mode": "multiply" },
              ".gemini-highlight": { "fill": "rgba(135, 206, 250, 0.4) !important", "fill-opacity": "1", "mix-blend-mode": "multiply" },
            },
            "body": { 
              "padding": "20px 40px !important", 
              "line-height": "1.7 !important", 
              "font-size": "18px !important",
              "color": "#333 !important",
              "word-wrap": "break-word",
            },
          });
          renditionRef.current.themes.select("custom");

          renditionRef.current.on('selected', (cfiRange, contents) => {
            if (!isMounted) return;
            setTimeout(() => {
                const selection = contents.window.getSelection();
                const selectionText = selection ? selection.toString().trim() : '';

                if (selectionText.length > 0 && renditionRef.current && renditionRef.current.location) {
                    const range = selection.getRangeAt(0);
                    const newCfi = renditionRef.current.location.cfiFromRange(range);
                    
                    setTempAnnotation({
                        text: selectionText,
                        cfi: newCfi,
                    });

                    const rect = range.getBoundingClientRect();
                    const viewerRect = viewerRef.current.getBoundingClientRect();

                    setSelectionPopover({
                        rect: {
                            top: rect.top - viewerRect.top,
                            left: rect.left - viewerRect.left + rect.width / 2,
                        },
                    });
                }
            }, 100);
          });
          
          let relocationTimer;
          renditionRef.current.on('relocated', (location) => {
            if (!isMounted || !bookRef.current) return;
            
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

                renditionRef.current.annotations.removeall(); 
                loadedAnnotations.forEach(anno => {
                  if (anno.cfi) {
                    drawHighlight(anno);
                  }
                });

            }, 250);
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
  }, [bookId, drawHighlight]);

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

  const handleSaveAnnotation = async (note) => {
    if (!note.trim()) {
      setSnackbar({ open: true, message: '批注内容不能为空' });
      return;
    }
    closeSelectionPopover();
    try {
      const response = await axios.post(`/books/${bookId}/annotations`, {
        content: note,
        highlighted_text: tempAnnotation.text,
        cfi: tempAnnotation.cfi,
      });
      const newAnnotation = response.data.annotation;
      drawHighlight(newAnnotation); 
      setAnnotations(prev => [...prev, newAnnotation]);
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      console.error("保存批注失败: ", err);
      setSnackbar({ open: true, message: err.response?.data?.error || '保存失败，请检查网络' });
    }
    setAnnotationModal({ open: false });
  };

  const handleGenerateGeminiAnnotation = async () => {
    closeSelectionPopover();
    setSnackbar({ open: true, message: '正在请求 Gem 为您生成批注...' });
    
    try {
        const currentPageText = getCurrentPageText();
        if (currentPageText.length < 30) {
            setSnackbar({ open: true, message: '当前页内容太少，无法生成有意义的批注' });
            return;
        }
        const pageStartCfi = renditionRef.current.currentLocation().start.cfi;
        
        const response = await axios.post(`/books/${bookId}/generate-gemini-annotation`, {
            page_content: currentPageText,
            cfi: pageStartCfi,
            highlighted_text: `[Gemini对本页的批注] ${currentPageText.substring(0, 50)}...`
        });
        
        if (response.data.success) {
            const newAnnotation = response.data.annotation;
            drawHighlight(newAnnotation);
            setAnnotations(prev => [...prev, newAnnotation]);
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
      const response = await axios.post(`/books/${bookId}/chat`, { message, page_content });
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: "抱歉，我好像出错了..." }]);
    }
    setIsChatSending(false);
  };

  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm("确定要删除这条批注吗？")) return;
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      const removedAnnotation = annotations.find(a => a.id === annotationId);
      if(removedAnnotation && renditionRef.current) {
         renditionRef.current.annotations.remove(removedAnnotation.cfi, "highlight");
      }
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      setSnackbar({ open: true, message: '批注已删除' });
    } catch (err) {
      setSnackbar({ open: true, message: '删除失败' });
    }
  };

  const handleNextPage = useCallback(() => { if (!selectionPopover && renditionRef.current) renditionRef.current.next(); }, [selectionPopover]);
  const handlePrevPage = useCallback(() => { if (!selectionPopover && renditionRef.current) renditionRef.current.prev(); }, [selectionPopover]);
  const onTocClick = (href) => { if(renditionRef.current) { renditionRef.current.display(href).then(() => setShowToc(false)); }};
  const handleJumpToAnnotation = (cfi) => { if(renditionRef.current) { renditionRef.current.display(cfi); setShowAnnotationsPanel(false); }};

  const handleKeyPress = useCallback((event) => {
    if (annotationModal.open || showGeminiChat || selectionPopover) return;
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (event.key === 'ArrowRight') handleNextPage();
    if (event.key === 'ArrowLeft') handlePrevPage();
  }, [handleNextPage, handlePrevPage, annotationModal.open, showGeminiChat, selectionPopover]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1, zIndex: 10 }}>
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
        
        <Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '25%', height: '100%', zIndex: 9, WebkitTapHighlightColor: 'transparent', cursor: selectionPopover || annotationModal.open ? 'default' : 'pointer' }} />
        <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '25%', height: '100%', zIndex: 9, WebkitTapHighlightColor: 'transparent', cursor: selectionPopover || annotationModal.open ? 'default' : 'pointer' }} />
      </Box>

      {/* ★★★ 最终修正版 Popover ★★★ */}
      <Popover
        open={Boolean(selectionPopover)}
        anchorReference="anchorPosition"
        anchorPosition={selectionPopover ? { top: selectionPopover.rect.top, left: selectionPopover.rect.left } : undefined}
        onClose={closeSelectionPopover} // 现在这个会正常工作了
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        // 删除了 sx={{ pointerEvents: 'none' }}
      >
        <Paper sx={{ p: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, borderRadius: '12px' }}>
          <Button size="small" startIcon={<CreateIcon />} onClick={() => { setAnnotationModal({ open: true }); setSelectionPopover(null); }}>
            批注
          </Button>
          <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateGeminiAnnotation}>
            Gem一下
          </Button>
          {/* 恢复了关闭按钮，提供明确的退出操作 */}
          <IconButton size="small" onClick={closeSelectionPopover}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Popover>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <Typography align="center" variant="body2" color="text.secondary" noWrap sx={{px: 2}}>{location.currentChapter}</Typography>
        <LinearProgress variant="determinate" value={location.progress} />
      </Box>
      
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2} component="form" onSubmit={(e) => { e.preventDefault(); handleSaveAnnotation(e.currentTarget.elements.note.value); }}>
          <Typography variant="subtitle1" noWrap sx={{mb: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>为“{tempAnnotation.text}”添加批注</Typography>
          <TextField
            name="note" autoFocus margin="dense" label="你的想法..." type="text"
            fullWidth multiline rows={3} variant="outlined"
          />
          <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1}}>
             <Button onClick={() => setAnnotationModal({ open: false })}>取消</Button>
             <Button type="submit" variant="contained">保存</Button>
          </Box>
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
                    primary={anno.highlighted_text || `[AI批注] ${anno.content.substring(0,20)}...`} 
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
