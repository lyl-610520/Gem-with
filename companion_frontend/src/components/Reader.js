import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar,
  ListItemButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import NotesIcon from '@mui/icons-material/Notes';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CreateIcon from '@mui/icons-material/Create';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// GeminiChat 组件 (完整代码)
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
  const routeLocation = useLocation();
  const { title } = routeLocation.state || {};
  
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const viewerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toc, setToc] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [bookLocation, setBookLocation] = useState({ currentPage: 1, totalPages: 1, progress: 0 });
  
  const [isTextSelectionOpen, setIsTextSelectionOpen] = useState(false);
  const [currentPageSentences, setCurrentPageSentences] = useState([]);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState({text: '', cfiRange: ''});
  
  const [annotationModal, setAnnotationModal] = useState({ open: false });
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  
  useEffect(() => {
    if (isTextSelectionOpen) { document.body.style.overflow = 'hidden'; } 
    else { document.body.style.overflow = 'auto'; }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isTextSelectionOpen]);
  
  const fetchAndDrawAnnotations = useCallback(async () => {
    if (!bookId) return;
    try {
      const response = await axios.get(`/books/${bookId}`);
      const loadedAnnotations = response.data.annotations || [];
      setAnnotations(loadedAnnotations);
      
      if (renditionRef.current && renditionRef.current.getContents()) {
        renditionRef.current.annotations.removeall();
        loadedAnnotations.forEach(anno => {
          if(anno.cfi) {
            renditionRef.current.annotations.add("highlight", anno.cfi, {}, () => {}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
          }
        });
      }
    } catch (err) {
      console.error("获取批注失败:", err);
    }
  }, [bookId]);

  useEffect(() => {
    if (renditionRef.current) renditionRef.current.destroy();
    if (bookRef.current) bookRef.current.destroy();
    if (!bookId) { setError("未找到书籍ID"); setIsLoading(false); return; }
    let isMounted = true;
    setIsLoading(true); setError('');

    const loadBook = async () => {
      try {
        const fileResponse = await axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer' });
        if (!isMounted) return;
        
        bookRef.current = Epub(fileResponse.data);
        await bookRef.current.ready;
        await bookRef.current.locations.generate(1600);
        if (!isMounted) return;
        
        setToc(bookRef.current.navigation.toc);
        setBookLocation(prev => ({ ...prev, totalPages: bookRef.current.locations.length() }));
        
        if (viewerRef.current) {
          renditionRef.current = bookRef.current.renderTo(viewerRef.current, { width: '100%', height: '100%' });
          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          
          const updateLocation = () => {
            if (!isMounted || !renditionRef.current || !bookRef.current.locations) return;
            const currentLocation = renditionRef.current.currentLocation();
            if (currentLocation && currentLocation.start) {
              const cfi = currentLocation.start.cfi;
              setBookLocation({ currentPage: bookRef.current.locations.pageFromCfi(cfi), totalPages: bookRef.current.locations.length(), progress: Math.round(bookRef.current.locations.percentageFromCfi(cfi) * 100) });
              localStorage.setItem(`book-progress-${bookId}`, cfi);
            }
          };

          renditionRef.current.on('displayed', async () => {
            if (!isMounted) return;
            await fetchAndDrawAnnotations();
            updateLocation();
          });
          
          await renditionRef.current.display(savedCfi || undefined);
          renditionRef.current.on('relocated', updateLocation);
        }
        if (isMounted) setIsLoading(false);
      } catch (err) {
        if (isMounted) { setError("加载失败，请刷新重试"); setIsLoading(false); }
      }
    };
    loadBook();
    return () => { isMounted = false; if (renditionRef.current) renditionRef.current.destroy(); if (bookRef.current) bookRef.current.destroy(); };
  }, [bookId, fetchAndDrawAnnotations]);

  const openAnnotationPanel = async () => {
    if (!renditionRef.current || !bookRef.current) return;
    try {
      const range = await renditionRef.current.getCurrentRange();
      if (!range) {
          setSnackbar({ open: true, message: '无法获取当前页面范围' });
          return;
      }
      const pageText = await bookRef.current.getRange(range.cfi).then(r => r.toString());
      const sentences = (pageText.match(/[^。？！；.?!;]+[。？！；.?!;]?/g) || []).filter(s => s.trim());
      setCurrentPageSentences(sentences);
      setSelectedSentence(null);
      setIsTextSelectionOpen(true);
    } catch(e) { console.error(e); setSnackbar({ open: true, message: '提取当前页文本失败' }); }
  };
  
  const handleSentenceClick = (sentence, index) => setSelectedSentence({ text: sentence, index: index });

  const handleConfirmSelection = async () => {
    if (!selectedSentence) { setSnackbar({ open: true, message: '请先点击选择一句话' }); return; }
    const selectedText = selectedSentence.text.trim();
    setIsTextSelectionOpen(false);
    setSnackbar({ open: true, message: '正在定位文本...' });

    try {
      const results = await bookRef.current.spine.search(selectedText);
      if (results.length === 0) { setSnackbar({ open: true, message: '无法在书中定位此文本' }); return; }
      
      const currentLocation = renditionRef.current.currentLocation();
      const currentHref = currentLocation.start.href;
      let finalResult = results.find(res => res.cfi.includes(currentHref)) || results;

      setTempAnnotation({ text: selectedText, cfiRange: finalResult.cfi });
      setAnnotationModal({ open: true });

    } catch (e) { console.error(e); setSnackbar({ open: true, message: '定位文本时出错' }); }
  };

  const handleSaveAnnotation = async (note) => {
    try {
      await axios.post(`/books/${bookId}/annotations`, { content: note, highlighted_text: tempAnnotation.text, cfi: tempAnnotation.cfiRange, page_number: bookLocation.currentPage });
      setSnackbar({ open: true, message: '批注已保存' });
      await fetchAndDrawAnnotations();
    } catch (err) { setSnackbar({ open: true, message: '保存失败' }); }
    setAnnotationModal({ open: false });
    setTempAnnotation({ text: '', cfiRange: ''});
  };
  
  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      setSnackbar({ open: true, message: '批注已删除' });
      await fetchAndDrawAnnotations();
    } catch (err) { setSnackbar({ open: true, message: '删除失败' }); }
  };
  
  const handleGenerateGeminiAnnotation = async () => {};
  const handleSendChatMessage = async (message) => {};

  const onTocClick = (href) => renditionRef.current?.display(href).then(() => setShowToc(false));
  const handleJumpToAnnotation = (cfi) => { renditionRef.current?.display(cfi); setShowAnnotationsPanel(false); };
  const handleNextPage = () => renditionRef.current?.next();
  const handlePrevPage = () => renditionRef.current?.prev();

  const handleKeyPress = useCallback((event) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (event.key === 'ArrowRight') handleNextPage();
    if (event.key === 'ArrowLeft') handlePrevPage();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '...'}</Typography>
        <Box>
          <Tooltip title="添加批注"><IconButton onClick={openAnnotationPanel}><CreateIcon /></IconButton></Tooltip>
          <Tooltip title="Gem写了什么"><IconButton onClick={handleGenerateGeminiAnnotation}><VisibilityIcon /></IconButton></Tooltip>
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} >
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible' }} />
        {!isLoading && !error && (
          <><Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 1, WebkitTapHighlightColor: 'transparent' }} />
          <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 1, WebkitTapHighlightColor: 'transparent' }} /></>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">第 {bookLocation.currentPage} / {bookLocation.totalPages} 页</Typography>
        <LinearProgress variant="determinate" value={bookLocation.progress} />
      </Box>
      
      <Drawer anchor="bottom" open={isTextSelectionOpen} onClose={() => setIsTextSelectionOpen(false)} sx={{ '& .MuiPaper-root': { maxHeight: '60vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}}>
        <Box sx={{p: 2, display: 'flex', flexDirection: 'column', height: '100%'}}>
           <Typography variant="h6" sx={{mb: 2, flexShrink: 0}}>请点击一句话来添加批注</Typography>
           <Paper variant="outlined" sx={{flexGrow: 1, p: 1, overflowY: 'auto' }}>
             {currentPageSentences.map((sentence, index) => (
               <Typography key={index} component="span" onClick={() => handleSentenceClick(sentence, index)}
                 sx={{
                   cursor: 'pointer', display: 'inline', p: '2px', m: '2px', borderRadius: '4px', transition: 'background-color 0.2s',
                   backgroundColor: selectedSentence?.index === index ? 'primary.light' : 'transparent',
                   color: selectedSentence?.index === index ? 'primary.contrastText' : 'inherit',
                   '&:hover': { backgroundColor: 'action.hover' }
                 }}
               >
                 {sentence}
               </Typography>
             ))}
           </Paper>
           <Button variant="contained" startIcon={<CheckCircleOutlineIcon />} onClick={handleConfirmSelection} disabled={!selectedSentence} sx={{mt: 2, flexShrink: 0}}>
             为选中内容添加批注
           </Button>
        </Box>
      </Drawer>

      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2}>
          <Typography variant="h6" noWrap>为 “{tempAnnotation.text}” 添加批注</Typography>
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
            {annotations.map((anno) => (
              <ListItem key={anno.id} secondaryAction={ <IconButton edge="end" onClick={() => handleDeleteAnnotation(anno.id)}> <DeleteIcon /> </IconButton> } disablePadding >
                <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                  <ListItemText primary={anno.highlighted_text} secondary={anno.content} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Drawer anchor="right" open={showToc} onClose={() => setShowToc(false)}>
        <Box sx={{ width: {xs: '90vw', sm: 300}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>目录</Typography>
          <List>{toc.map((item, index) => (
              <ListItem key={index} disablePadding><ListItemButton onClick={() => onTocClick(item.href)}><ListItemText primary={item.label.trim()} /></ListItemButton></ListItem>
          ))}</List>
        </Box>
      </Drawer>
      <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1200 }} onClick={() => setShowGeminiChat(true)}><ChatIcon /></Fab>
      <GeminiChat open={showGeminiChat} onClose={() => setShowGeminiChat(false)} onSendMessage={handleSendChatMessage} messages={chatMessages} isSending={isChatSending}/>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
