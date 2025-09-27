import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Popover, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar, ListItemAvatar,
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
import CreateIcon from '@mui/icons-material/Create'; // [新] 引入画笔图标

// GeminiChat 组件 (保持不变)
function GeminiChat({ open, onClose, onSendMessage, messages, isSending }) {
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
  
  const [rendition, setRendition] = useState(null);
  const [book, setBook] = useState(null);
  const [toc, setToc] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const viewerRef = useRef(null);
  const [annotations, setAnnotations] = useState([]);
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [annotationModal, setAnnotationModal] = useState({ open: false, text: '', cfiRange: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [bookLocation, setBookLocation] = useState({ currentPage: 1, totalPages: 1, progress: 0 });

  // --- VVVV [新功能] 用于“两点式”批注的状态 VVVV ---
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [startCfi, setStartCfi] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState({text: '', cfiRange: ''});
  // --- ^^^^ 新状态结束 ^^^^ ---


  // --- VVVV [页码修复] 创建一个稳定可靠的位置更新函数 VVVV ---
  const updateLocation = useCallback((renditionToUpdate, bookToUpdate) => {
    const activeRendition = renditionToUpdate || rendition;
    const activeBook = bookToUpdate || book;
    if (!activeRendition || !activeBook || !activeBook.locations || activeBook.locations.length() === 0) {
      return;
    }
    const currentLocation = activeRendition.currentLocation();
    if (currentLocation && currentLocation.start) {
      const cfi = currentLocation.start.cfi;
      const page = activeBook.locations.pageFromCfi(cfi);
      const percent = activeBook.locations.percentageFromCfi(cfi);
      setBookLocation({ currentPage: page, totalPages: activeBook.locations.length(), progress: Math.round(percent * 100) });
      localStorage.setItem(`book-progress-${bookId}`, cfi);
    }
  }, [book, rendition, bookId]);
  // --- ^^^^ 页码修复函数结束 ^^^^ ---


  useEffect(() => {
    let currentBook;
    let currentRendition;
    let isMounted = true; 

    const handleKeyPress = (event) => {
        if (document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea') { return; }
        if (currentRendition) {
            if (event.key === 'ArrowRight') { currentRendition.next().then(() => updateLocation(currentRendition, currentBook)); }
            if (event.key === 'ArrowLeft') { currentRendition.prev().then(() => updateLocation(currentRendition, currentBook)); }
        }
    };
    window.addEventListener('keydown', handleKeyPress);

    // --- VVVV [新功能] 处理iframe内部点击事件的核心逻辑 VVVV ---
    const handleIframeClick = async (event) => {
      if (!isAnnotationMode || !currentRendition || !currentBook) return;
      event.preventDefault();
      event.stopPropagation();

      const iframe = viewerRef.current.querySelector('iframe');
      if (!iframe) return;
      const rect = iframe.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const range = currentRendition.getRange(currentRendition.cfiFromPoint(x, y));
      const cfi = (await range).cfi;

      if (!startCfi) {
        setStartCfi(cfi);
        setSnackbar({ open: true, message: '起点已选择，请点击终点' });
      } else {
        try {
          const fullCfiRange = new Epub.Range(startCfi, cfi).toString();
          const text = await currentBook.getRange(fullCfiRange).then(r => r.toString());
          
          if (text.trim()) {
            setTempAnnotation({ text: text, cfiRange: fullCfiRange });
            setAnnotationModal({ open: true });
          } else {
            setSnackbar({ open: true, message: '选择无效，请重试' });
          }
        } catch(e) {
            console.error("生成批注范围失败:", e);
            setSnackbar({ open: true, message: '选择范围无效，请确保终点在起点之后' });
        } finally {
            setStartCfi(null);
            setIsAnnotationMode(false);
        }
      }
    };
    // --- ^^^^ 新功能核心逻辑结束 ^^^^ ---

    const loadBook = async () => {
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
        
        const loadedAnnotations = detailsResponse.data.annotations || [];
        setAnnotations(loadedAnnotations);

        currentBook = Epub(fileResponse.data);
        setBook(currentBook);
        
        await currentBook.ready;
        await currentBook.locations.generate(1600);
        if (isMounted) {
          setBookLocation(prev => ({ ...prev, totalPages: currentBook.locations.length() }));
        }

        if (viewerRef.current) {
          currentRendition = currentBook.renderTo(viewerRef.current, { width: '100%', height: '100%' });
          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          await currentRendition.display(savedCfi || undefined);
          if (isMounted) setRendition(currentRendition);

          loadedAnnotations.forEach(anno => {
            currentRendition.annotations.add("highlight", anno.cfi, { id: anno.id }, () => {}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
          });

          // --- [已废弃] 旧的文本选择方式，在移动端不可靠 ---
          // currentRendition.on('selected', (cfiRange, contents) => { ... });

          // --- [页码修复] 使用更可靠的方式更新位置 ---
          currentRendition.on('relocated', () => updateLocation(currentRendition, currentBook));
          updateLocation(currentRendition, currentBook); // 初始化首次加载的位置

          // --- [新功能] 为iframe添加点击监听器 ---
          currentRendition.on('displayed', () => {
              const iframeDoc = currentRendition.getContents()[0].document;
              if (iframeDoc) {
                  iframeDoc.addEventListener('click', handleIframeClick);
              }
          });

          if (isMounted) { setToc(currentBook.navigation.toc); setIsLoading(false); }
        }
      } catch (err) {
        console.error("加载书籍或批注失败:", err);
        if (isMounted) { setError("加载失败，请刷新重试"); setIsLoading(false); }
      }
    };

    loadBook();
    
    return () => { 
        isMounted = false; 
        window.removeEventListener('keydown', handleKeyPress);
        // --- [新功能] 清理iframe的事件监听 ---
        if (currentRendition && currentRendition.getContents) {
          const iframeDoc = currentRendition.getContents()[0]?.document;
          if (iframeDoc) {
            iframeDoc.removeEventListener('click', handleIframeClick);
          }
        }
        if (currentRendition) currentRendition.destroy(); 
        if (currentBook) currentBook.destroy(); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]); // 依赖项已简化，updateLocation被useCallback包裹

  const onTocClick = async (href) => { 
    if (!rendition) return;
    await rendition.display(href);
    setShowToc(false);
    updateLocation(); // [页码修复] 跳转后主动更新位置
  };

  const handleSaveAnnotation = async (note) => {
    try {
      const response = await axios.post(`/books/${bookId}/annotations`, {
        content: note, 
        highlighted_text: tempAnnotation.text, 
        cfi: tempAnnotation.cfiRange,
        page_number: bookLocation.currentPage,
      });
      const newAnno = response.data.annotation;
      setAnnotations(prev => [...prev, newAnno]);
      rendition.annotations.add("highlight", newAnno.cfi, { id: newAnno.id }, ()=>{}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      setSnackbar({ open: true, message: '保存失败' });
    }
    setAnnotationModal({ open: false });
    setTempAnnotation({ text: '', cfiRange: ''});
  };
  
  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      const annoToRemove = annotations.find(a => a.id === annotationId);
      if (annoToRemove && annoToRemove.cfi) { // 确保有CFI才移除高亮
         rendition.annotations.remove(annoToRemove.cfi, "highlight");
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

  // --- VVVV [新功能] 切换批注模式的函数 VVVV ---
  const toggleAnnotationMode = () => {
    const newMode = !isAnnotationMode;
    setIsAnnotationMode(newMode);
    setStartCfi(null); // 每次切换都重置
    if (newMode) {
      setSnackbar({ open: true, message: '批注模式已开启，请点击内容起点' });
    } else {
      setSnackbar({ open: true, message: '批注模式已关闭' });
    }
  };
  // --- ^^^^ 新功能函数结束 ^^^^ ---

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '...'}</Typography>
        <Box>
          {/* --- VVVV [新功能] 新增的批注模式按钮 VVVV --- */}
          <Tooltip title="两点法添加批注">
            <IconButton onClick={toggleAnnotationMode} color={isAnnotationMode ? "primary" : "default"}>
              <CreateIcon />
            </IconButton>
          </Tooltip>
          {/* --- ^^^^ 新功能按钮结束 ^^^^ --- */}
          <Tooltip title="Gem写了什么"><IconButton onClick={handleGenerateGeminiAnnotation}><VisibilityIcon /></IconButton></Tooltip>
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading ? 'hidden' : 'visible', cursor: isAnnotationMode ? 'crosshair' : 'default' }} />
        
        {!isLoading && !error && !isAnnotationMode && (
          <>
            <Box onClick={() => { if(rendition) rendition.prev().then(updateLocation); }} sx={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 1 }} />
            <Box onClick={() => { if(rendition) rendition.next().then(updateLocation); }} sx={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 1 }} />
          </>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">
          第 {bookLocation.currentPage} / {bookLocation.totalPages} 页
        </Typography>
        <LinearProgress variant="determinate" value={bookLocation.progress} />
      </Box>
      
      {/* --- [已废弃] 旧的Popover选择菜单，不再需要 --- */}
      {/* <Popover open={selectionMenu.open} ... /> */}
      
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2}>
          <Typography variant="h6" sx={{
            maxHeight: '3em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            为 “{tempAnnotation.text}” 添加批注
          </Typography>
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
              <ListItem 
                key={anno.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(anno.id); }}>
                    <DeleteIcon />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                  <ListItemText
                    primary={anno.highlighted_text}
                    secondary={anno.content}
                  />
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
