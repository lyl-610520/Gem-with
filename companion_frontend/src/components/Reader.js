import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Button, TextField,
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
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

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
  
  // [修改 1/5] 简化 state，不再需要 Popover 的 anchorEl，并用一个 state 同时服务于移动端和桌面端
  const [selectionInfo, setSelectionInfo] = useState({ text: '', cfiRange: '' });
  const [annotationModal, setAnnotationModal] = useState({ open: false });

  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [bookLocation, setBookLocation] = useState({ currentPage: 1, totalPages: 1, progress: 0 });

  useEffect(() => {
    let currentBook;
    let currentRendition;
    let isMounted = true; 

    const handleKeyPress = (event) => {
        if (document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea') { return; }
        if (currentRendition) {
            if (event.key === 'ArrowRight') currentRendition.next();
            if (event.key === 'ArrowLeft') currentRendition.prev();
        }
    };
    window.addEventListener('keydown', handleKeyPress);

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

        // [核心修复] 确保 locations 生成完毕后才进行后续操作，这是解决页码问题的关键
        console.log("开始生成书籍定位点 (locations)...");
        await currentBook.locations.generate(1600);
        console.log(`定位点生成完毕，共 ${currentBook.locations.length()} 页。`);

        if (isMounted) {
          // 现在可以安全地更新总页数了
          setBookLocation(prev => ({ ...prev, totalPages: currentBook.locations.length() }));
        }

        if (viewerRef.current) {
          currentRendition = currentBook.renderTo(viewerRef.current, { width: '100%', height: '100%' });
          if (isMounted) setRendition(currentRendition);

          // [核心修复] 将 relocated 事件监听放在这里，确保 book.locations 可用
          currentRendition.on('relocated', (loc) => {
            if (isMounted && currentBook && currentBook.locations) {
              const cfi = loc.start.cfi;
              // 此时 pageFromCfi 和 percentageFromCfi 才能正常工作
              const page = currentBook.locations.pageFromCfi(cfi);
              const percent = currentBook.locations.percentageFromCfi(cfi);
              setBookLocation({ currentPage: page, totalPages: currentBook.locations.length(), progress: Math.round(percent * 100) });
              localStorage.setItem(`book-progress-${bookId}`, cfi);
            }
          });

          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          await currentRendition.display(savedCfi || undefined);

          loadedAnnotations.forEach(anno => {
            currentRendition.annotations.add("highlight", anno.cfi, { id: anno.id }, () => {}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
          });

          // [修改 2/5] 优化 selected 事件处理，解决移动端批注问题
          currentRendition.on('selected', (cfiRange, contents) => {
            const selectedText = contents.window.getSelection().toString().trim();
            
            // 增加健壮性检查，确保 cfiRange 有效，这是修复保存失败的关键
            if (selectedText && cfiRange) {
              // 不再使用 Popover，直接准备打开底部抽屉
              setSelectionInfo({ text: selectedText, cfiRange: cfiRange });
              setAnnotationModal({ open: true });
            } else {
              console.warn("选区事件触发，但未能获取有效的 cfiRange 或文本。");
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
        if (currentRendition) currentRendition.destroy(); 
        if (currentBook) currentBook.destroy(); 
    };
  }, [bookId]);
  
  const onTocClick = async (href) => { 
    if (!rendition || !book) return;
    try {
      await rendition.display(href);
      setShowToc(false);
      // 'relocated' 事件会自动处理后续的页码更新，这里无需手动设置
    } catch (err) {
      console.error("目录跳转失败:", err);
    }
  };

  // [修改 3/5] 更新函数签名，直接接收所需参数
  const handleSaveAnnotation = async (note, highlightedText, cfi) => {
    try {
      const response = await axios.post(`/books/${bookId}/annotations`, {
        content: note, 
        highlighted_text: highlightedText, 
        cfi: cfi,
        page_number: bookLocation.currentPage,
      });
      const newAnno = response.data.annotation;
      setAnnotations(prev => [...prev, newAnno]);
      rendition.annotations.add("highlight", newAnno.cfi, { id: newAnno.id }, ()=>{}, "hl-class", { "fill": "yellow", "fill-opacity": "0.3" });
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      console.error("保存批注失败:", err.response ? err.response.data : err);
      setSnackbar({ open: true, message: '保存失败，请重试' });
    }
    setAnnotationModal({ open: false });
    setSelectionInfo({ text: '', cfiRange: '' }); // 清理
  };
  
  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      const annoToRemove = annotations.find(a => a.id === annotationId);
      if (annoToRemove) rendition.annotations.remove(annoToRemove.cfi, "highlight");
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
  
  // (handleGenerateGeminiAnnotation 和 handleSendChatMessage 保持不变)
  const handleGenerateGeminiAnnotation = async () => {};
  const handleSendChatMessage = async (message) => {};

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{title || '...'}</Typography>
        <Box>
          <Tooltip title="Gem写了什么"><IconButton onClick={handleGenerateGeminiAnnotation}><VisibilityIcon /></IconButton></Tooltip>
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading ? 'hidden' : 'visible' }} />
        
        {!isLoading && !error && (
          <>
            <Box onClick={() => rendition?.prev()} sx={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 1, cursor: 'pointer' }} />
            <Box onClick={() => rendition?.next()} sx={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 1, cursor: 'pointer' }} />
          </>
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary">
          第 {bookLocation.currentPage} / {bookLocation.totalPages} 页
        </Typography>
        <LinearProgress variant="determinate" value={bookLocation.progress} />
      </Box>
      
      {/* [修改 4/5] 移除 Popover 组件，不再需要它 */}
      
      {/* [修改 5/5] 修改 Drawer 组件，使其更健壮 */}
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false })}>
        <Box p={2} sx={{maxWidth: '600px', mx: 'auto'}}>
          <Typography variant="h6" sx={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              mb: 1
            }}>
            为 “{selectionInfo.text}” 添加批注
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="你的想法..."
            type="text"
            fullWidth
            variant="standard"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault(); // 防止回车换行
                handleSaveAnnotation(e.target.value.trim(), selectionInfo.text, selectionInfo.cfiRange);
              }
            }}
          />
        </Box>
      </Drawer>

      <Drawer anchor="right" open={showAnnotationsPanel} onClose={() => setShowAnnotationsPanel(false)}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {annotations && annotations.length > 0 ? annotations.map((anno) => (
              <React.Fragment key={anno.id}>
                <ListItem 
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(anno.id); }}>
                      <DeleteIcon />
                    </IconButton>
                  }
                  disablePadding
                >
                  <ListItemButton onClick={() => handleJumpToAnnotation(anno.cfi)}>
                    <ListItemText
                      primaryTypographyProps={{style: {fontWeight: 500}}}
                      secondaryTypographyProps={{style: { whiteSpace: 'pre-wrap'}}}
                      primary={anno.highlighted_text}
                      secondary={anno.content}
                    />
                  </ListItemButton>
                </ListItem>
                <Divider />
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
