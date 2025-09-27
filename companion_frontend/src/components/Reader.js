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


// GeminiChat 组件 (保持不变)
function GeminiChat({ open, onClose, onSendMessage, messages, isSending }) {
  // ... (此组件代码无变化，为简洁省略)
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

  // --- [新架构] 状态 ---
  const [isTextSelectionOpen, setIsTextSelectionOpen] = useState(false); // 控制文本选择面板
  const [currentPageText, setCurrentPageText] = useState(''); // 存储当前页的纯文本
  const [tempAnnotation, setTempAnnotation] = useState({text: '', cfiRange: ''});
  
  const [annotationModal, setAnnotationModal] = useState({ open: false });
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  
  // --- 核心加载逻辑 (已稳定) ---
  useEffect(() => {
    if (renditionRef.current) renditionRef.current.destroy();
    if (bookRef.current) bookRef.current.destroy();
    
    if (!bookId) {
      setError("未找到书籍ID");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    const loadBook = async () => {
      try {
        const [fileResponse, detailsResponse] = await Promise.all([
          axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer' }),
          axios.get(`/books/${bookId}`)
        ]);
        if (!isMounted) return;

        bookRef.current = Epub(fileResponse.data);
        await bookRef.current.ready;
        await bookRef.current.locations.generate(1600);
        if (!isMounted) return;

        setToc(bookRef.current.navigation.toc);
        setAnnotations(detailsResponse.data.annotations || []);
        setBookLocation(prev => ({ ...prev, totalPages: bookRef.current.locations.length() }));
        
        if (viewerRef.current) {
          renditionRef.current = bookRef.current.renderTo(viewerRef.current, { width: '100%', height: '100%' });
          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          await renditionRef.current.display(savedCfi || undefined);

          const updateLocation = () => {
            if (!isMounted || !renditionRef.current || !bookRef.current.locations) return;
            const currentLocation = renditionRef.current.currentLocation();
            if (currentLocation && currentLocation.start) {
              const cfi = currentLocation.start.cfi;
              setBookLocation({
                currentPage: bookRef.current.locations.pageFromCfi(cfi),
                totalPages: bookRef.current.locations.length(),
                progress: Math.round(bookRef.current.locations.percentageFromCfi(cfi) * 100)
              });
              localStorage.setItem(`book-progress-${bookId}`, cfi);
            }
          };
          
          renditionRef.current.on('relocated', updateLocation);
          renditionRef.current.on('displayed', updateLocation);
          
          (detailsResponse.data.annotations || []).forEach(anno => {
            if(anno.cfi) renditionRef.current.annotations.add("highlight", anno.cfi, {}, () => {}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
          });
        }
        
        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error("加载书籍失败:", err);
        if (isMounted) {
          setError("加载失败，请刷新重试");
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
  }, [bookId]);

  // --- [新架构] 打开批注面板的函数 ---
  const openAnnotationPanel = async () => {
    if (!renditionRef.current) return;
    try {
      // 获取当前可见视图的内容
      const contents = renditionRef.current.getContents()[0];
      const doc = contents.document;
      // 从body中提取所有文本，并进行清理
      const text = doc.body.innerText.replace(/\s\s+/g, '\n').trim();
      setCurrentPageText(text);
      setIsTextSelectionOpen(true);
    } catch(e) {
      console.error("提取页面文本失败:", e);
      setSnackbar({ open: true, message: '提取文本失败，请稍后重试' });
    }
  };

  // --- [新架构] 处理文本选择并创建批注的函数 ---
  const handleTextSelection = async () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      setSnackbar({ open: true, message: '您没有选择任何文本' });
      return;
    }
    
    setIsTextSelectionOpen(false);
    setSnackbar({ open: true, message: '正在定位文本...' });

    try {
      // 使用epubjs的搜索功能来找到文本的CFI
      const searchResults = await bookRef.current.spine.search(selectedText);
      if (searchResults.length === 0) {
        setSnackbar({ open: true, message: '无法在书中定位此文本' });
        return;
      }
      
      // 优选当前页面的结果
      const currentLocation = renditionRef.current.currentLocation();
      const currentCfiRange = new Epub.Cfi(currentLocation.start.cfi).range;
      
      let finalResult = searchResults[0]; // 默认第一个
      for(const result of searchResults) {
        const resultRange = new Epub.Cfi(result.cfi).range;
        if(resultRange.compare(currentCfiRange) === 0) {
           finalResult = result;
           break;
        }
      }

      setTempAnnotation({ text: selectedText, cfiRange: finalResult.cfi });
      setAnnotationModal({ open: true });

    } catch (e) {
      console.error("搜索CFI失败:", e);
      setSnackbar({ open: true, message: '定位文本时出错' });
    }
  };

  const handleSaveAnnotation = async (note) => {
    // ... 此函数逻辑不变 ...
    try {
        const response = await axios.post(`/books/${bookId}/annotations`, {
          content: note, highlighted_text: tempAnnotation.text, cfi: tempAnnotation.cfiRange,
          page_number: bookLocation.currentPage,
        });
        const newAnno = response.data.annotation;
        setAnnotations(prev => [...prev, newAnno]);
        if(newAnno.cfi) renditionRef.current.annotations.add("highlight", newAnno.cfi, {}, ()=>{}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
        setSnackbar({ open: true, message: '批注已保存' });
      } catch (err) {
        setSnackbar({ open: true, message: '保存失败' });
      }
      setAnnotationModal({ open: false });
      setTempAnnotation({ text: '', cfiRange: ''});
  };
  
  const handleDeleteAnnotation = async (annotationId) => {
    // ... 此函数逻辑不变 ...
    try {
        await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
        const annoToRemove = annotations.find(a => a.id === annotationId);
        if (annoToRemove && annoToRemove.cfi && renditionRef.current) {
           renditionRef.current.annotations.remove(annoToRemove.cfi, "highlight");
        }
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
        setSnackbar({ open: true, message: '批注已删除' });
      } catch (err) {
        setSnackbar({ open: true, message: '删除失败' });
      }
  };

  const onTocClick = (href) => renditionRef.current?.display(href).then(() => setShowToc(false));
  const handleJumpToAnnotation = (cfi) => {
    renditionRef.current?.display(cfi);
    setShowAnnotationsPanel(false);
  };
  
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
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} >
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible' }} />
        
        {!isLoading && !error && (
          <>
            <Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 1 }} />
            <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 1 }} />
          </>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">第 {bookLocation.currentPage} / {bookLocation.totalPages} 页</Typography>
        <LinearProgress variant="determinate" value={bookLocation.progress} />
      </Box>
      
      {/* --- [新架构] 文本选择面板 --- */}
      <Drawer anchor="bottom" open={isTextSelectionOpen} onClose={() => setIsTextSelectionOpen(false)} sx={{ '& .MuiPaper-root': { maxHeight: '60vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}}>
        <Box sx={{p: 2, display: 'flex', flexDirection: 'column', height: '100%'}}>
           <Typography variant="h6" sx={{mb: 1}}>选择文本以添加批注</Typography>
           <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>请使用您设备的长按、拖动功能来选择下方文字。</Typography>
           <Paper variant="outlined" sx={{flexGrow: 1, p: 2, overflowY: 'auto', whiteSpace: 'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text'}}>
             {currentPageText}
           </Paper>
           <Button variant="contained" startIcon={<CheckCircleOutlineIcon />} onClick={handleTextSelection} sx={{mt: 2, flexShrink: 0}}>
             为选中内容添加批注
           </Button>
        </Box>
      </Drawer>

      {/* --- [新架构] 最终的批注输入面板 --- */}
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2}>
          <Typography variant="h6" noWrap>为 “{tempAnnotation.text}” 添加批注</Typography>
          <TextField
            autoFocus margin="dense" label="你的想法..." type="text" fullWidth variant="standard"
            onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { handleSaveAnnotation(e.target.value); } }}
          />
        </Box>
      </Drawer>
      
      {/* ... 其他Drawer和Fab组件保持不变 ... */}
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
      <GeminiChat open={showGeminiChat} onClose={() => setShowGeminiChat(false)} onSendMessage={()=>{}} messages={chatMessages} isSending={isChatSending} />
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
