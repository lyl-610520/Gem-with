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

// GeminiChat 组件 (保持不变)
function GeminiChat({ open, onClose, onSendMessage, messages, isSending }) {
  // ... (此组件代码无变化，为简洁省略，请保留您原来的代码)
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const handleSend = () => { if (input.trim()) { onSendMessage(input.trim()); setInput(''); } };
  if (!open) return null;
  return (
    <Paper elevation={12} sx={{ position: 'fixed', bottom: {xs: 10, sm: 20}, right: {xs: 10, sm: 20}, width: {xs: 'calc(100% - 20px)', sm: 360}, height: {xs: '70vh', sm: 500}, zIndex: 1300, display: 'flex', flexDirection: 'column', borderRadius: '20px', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <Typography variant="h6" sx={{fontWeight: 'bold'}}>与 Gem 伴读</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((msg, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
            {msg.sender === 'gemini' && <Avatar sx={{ bgcolor: 'primary.light', mr: 1, width: 32, height: 32 }}><AutoAwesomeIcon fontSize="small" /></Avatar>}
            <Paper elevation={0} sx={{ p: '10px 14px', borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', bgcolor: msg.sender === 'user' ? 'primary.main' : 'rgba(0,0,0,0.05)', color: msg.sender === 'user' ? 'white' : 'black', maxWidth: '80%' }}>
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

function Reader() {
  const { bookId } = useParams();
  const routeLocation = useLocation();
  const { title } = routeLocation.state || {};
  
  // --- [核心重构] 使用useRef管理epubjs实例 ---
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const viewerRef = useRef(null);

  // --- UI相关的状态，保留在useState中 ---
  const [toc, setToc] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [annotations, setAnnotations] = useState([]);
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [annotationModal, setAnnotationModal] = useState({ open: false });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [bookLocation, setBookLocation] = useState({ currentPage: 1, totalPages: 1, progress: 0 });
  
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [startCfi, setStartCfi] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState({text: '', cfiRange: ''});
  
  // 使用useRef来让事件监听函数能访问到最新的state
  const annotationStateRef = useRef({ isAnnotationMode, startCfi });
  useEffect(() => {
    annotationStateRef.current = { isAnnotationMode, startCfi };
  }, [isAnnotationMode, startCfi]);

  // --- 稳定的useEffect，只负责加载和销毁书籍 ---
  useEffect(() => {
    // 确保清理上一个实例
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

          // --- 重新定义事件处理函数，确保它们在当前闭包内 ---
          const updateLocation = () => {
            if (!renditionRef.current || !bookRef.current.locations) return;
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

          const handleIframeClick = async (event) => {
            const { isAnnotationMode: currentIsAnnotationMode, startCfi: currentStartCfi } = annotationStateRef.current;
            if (!currentIsAnnotationMode || !renditionRef.current || !bookRef.current) return;
            
            event.preventDefault(); event.stopPropagation();
            const iframe = viewerRef.current.querySelector('iframe');
            if (!iframe) return;
            const rect = iframe.getBoundingClientRect();
            
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const cfi = renditionRef.current.cfiFromPoint(x, y);

            if (!currentStartCfi) {
              setStartCfi(cfi);
              setSnackbar({ open: true, message: '起点已选择，请点击终点' });
            } else {
              try {
                const fullCfiRange = new Epub.Range(currentStartCfi, cfi).toString();
                const text = await bookRef.current.getRange(fullCfiRange).then(r => r.toString());
                if (text.trim()) {
                  setTempAnnotation({ text: text, cfiRange: fullCfiRange });
                  setAnnotationModal({ open: true });
                }
              } catch(e) { console.error("生成范围失败:", e); } 
              finally {
                setStartCfi(null);
                setIsAnnotationMode(false);
              }
            }
          };
          
          renditionRef.current.on('relocated', updateLocation);
          renditionRef.current.on('displayed', () => {
              updateLocation(); // 初次显示时更新位置
              const contents = renditionRef.current.getContents();
              if (contents[0]) {
                contents[0].document.addEventListener('click', handleIframeClick);
                contents[0].document.addEventListener('touchstart', handleIframeClick);
              }
          });
          
          (detailsResponse.data.annotations || []).forEach(anno => {
            if(anno.cfi) renditionRef.current.annotations.add("highlight", anno.cfi, { id: anno.id }, () => {}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
          });
        }
        
        if (isMounted) setIsLoading(false);

      } catch (err) {
        console.error("加载书籍失败，这是详细错误:", err);
        if (isMounted) {
          setError("加载失败，请刷新重试。如果问题持续，可能是文件损坏。");
          setIsLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      isMounted = false;
      if (renditionRef.current) {
        // 清理事件监听可以省略，因为destroy()会处理
        renditionRef.current.destroy();
      }
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [bookId]); // 这个useEffect只依赖bookId，绝对稳定！

  // --- 所有交互函数现在都从 renditionRef.current 获取实例 ---
  const onTocClick = async (href) => { 
    if (!renditionRef.current) return;
    await renditionRef.current.display(href);
    setShowToc(false);
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
        if(newAnno.cfi) renditionRef.current.annotations.add("highlight", newAnno.cfi, { id: newAnno.id }, ()=>{}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
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

  const handleJumpToAnnotation = (cfi) => {
    onTocClick(cfi);
    setShowAnnotationsPanel(false);
  };
  
  const handleGenerateGeminiAnnotation = async () => {};
  const handleSendChatMessage = async (message) => {};

  const toggleAnnotationMode = () => {
    const newMode = !isAnnotationMode;
    setIsAnnotationMode(newMode);
    setStartCfi(null);
    setSnackbar({ open: true, message: newMode ? '批注模式已开启' : '批注模式已关闭' });
  };
  
  const handleNextPage = () => renditionRef.current?.next();
  const handlePrevPage = () => renditionRef.current?.prev();

  // --- KeyPress事件处理也需要用useCallback和ref来稳定 ---
  const handleKeyPress = useCallback((event) => {
    if (document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea') return;
    if (event.key === 'ArrowRight') handleNextPage();
    if (event.key === 'ArrowLeft') handlePrevPage();
  }, []); // 空依赖数组，函数永不改变

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
          <Tooltip title="两点法添加批注"><IconButton onClick={toggleAnnotationMode} color={isAnnotationMode ? "primary" : "default"}><CreateIcon /></IconButton></Tooltip>
          <Tooltip title="Gem写了什么"><IconButton onClick={handleGenerateGeminiAnnotation}><VisibilityIcon /></IconButton></Tooltip>
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} >
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible', cursor: isAnnotationMode ? 'crosshair' : 'default' }} />
        
        {!isLoading && !error && !isAnnotationMode && (
          <>
            <Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 1, WebkitTapHighlightColor: 'transparent' }} />
            <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 1, WebkitTapHighlightColor: 'transparent' }} />
          </>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">
          第 {bookLocation.currentPage} / {bookLocation.totalPages} 页
        </Typography>
        <LinearProgress variant="determinate" value={bookLocation.progress} />
      </Box>
      
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2}>
          <Typography variant="h6" sx={{ maxHeight: '3em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            为 “{tempAnnotation.text}” 添加批注
          </Typography>
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
            {annotations && annotations.length > 0 ? annotations.map((anno) => (
              <ListItem key={anno.id} secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteAnnotation(anno.id)}> <DeleteIcon /> </IconButton>
                } disablePadding >
                <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                  <ListItemText primary={anno.highlighted_text} secondary={anno.content} />
                </ListItemButton>
              </ListItem>
            )) : <Typography sx={{p: 2, color: 'text.secondary'}}>还没有任何批注</Typography>}
          </List>
        </Box>
      </Drawer>

      <Drawer anchor="right" open={showToc} onClose={() => setShowToc(false)}>
        <Box sx={{ width: {xs: '90vw', sm: 300}, p: 2 }}>
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
