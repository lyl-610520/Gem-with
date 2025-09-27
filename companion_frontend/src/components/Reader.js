// src/components/Reader.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Epub, { Rendition } from 'epubjs';
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// GeminiChat 组件保持不变，这里省略以保持简洁
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
    // ... (你原来的 GeminiChat 组件代码可以原封不动地放在这里) ...
}

function Reader() {
  const { bookId } = useParams();
  
  // [核心] useRef 用于持有不会轻易改变的实例
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const viewerRef = useRef(null);

  // [核心] 状态管理
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookTitle, setBookTitle] = useState('加载中...');
  const [toc, setToc] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  
  // [页码改造] 我们不再追踪虚拟页码，而是追踪更可靠的章节和进度
  const [location, setLocation] = useState({
      progress: 0,
      currentChapter: '加载中...'
  });

  // [批注改造] 这是全新的、更简单的批注流程状态
  const [selectionPopover, setSelectionPopover] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState({ text: '', cfi: '' });
  const [annotationModal, setAnnotationModal] = useState({ open: false });

  // [UI状态] 管理各种面板和抽屉的显示
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  
  // [反馈状态]
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);

  // [新增] 获取当前可见文本内容的函数
  const getCurrentPageText = useCallback(() => {
    if (!renditionRef.current) return "";
    const contents = renditionRef.current.getContents();
    if (contents.length > 0 && contents[0].document) {
      return contents[0].document.body.innerText;
    }
    return "";
  }, []);
  
  // [改造] 获取并绘制批注 (逻辑基本不变，但调用时机更精确)
  const fetchAndDrawAnnotations = useCallback(async () => {
    if (!bookId) return;
    try {
      // 从后端获取这本书的所有批注
      const response = await axios.get(`/books/${bookId}`);
      const loadedAnnotations = response.data.annotations || [];
      setAnnotations(loadedAnnotations);
      
      // 确保rendition已经准备好
      if (renditionRef.current && renditionRef.current.getContents()) {
        // 先移除所有旧的高亮
        renditionRef.current.annotations.removeall();
        // 重新添加高亮
        loadedAnnotations.forEach(anno => {
          if (anno.cfi) {
            // 使用不同的颜色区分用户批注和AI批注
            const highlightColor = anno.is_gemini_annotation ? 'rgba(135, 206, 250, 0.4)' : 'rgba(255, 255, 0, 0.4)';
            renditionRef.current.annotations.add("highlight", anno.cfi, {}, () => {}, "hl-class", { "fill": highlightColor });
          }
        });
      }
    } catch (err) {
      console.error("获取批注失败:", err);
      setSnackbar({ open: true, message: '无法加载批注' });
    }
  }, [bookId]);

  // [核心改造] 书籍加载和渲染的主Effect
  useEffect(() => {
    let isMounted = true;
    if (!bookId) {
      setError("未找到书籍ID");
      setIsLoading(false);
      return;
    }

    const loadBook = async () => {
      try {
        setIsLoading(true);
        setError('');

        // 1. 获取书籍文件
        const fileResponse = await axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer' });
        if (!isMounted) return;

        // 2. 初始化Epub实例
        bookRef.current = Epub(fileResponse.data);
        await bookRef.current.ready;
        if (!isMounted) return;

        // 3. 获取元数据：标题和目录
        const meta = await bookRef.current.loaded.metadata;
        if (isMounted) {
            setBookTitle(meta.title);
            setToc(bookRef.current.navigation.toc);
        }

        // 4. 渲染到DOM
        if (viewerRef.current) {
          renditionRef.current = bookRef.current.renderTo(viewerRef.current, { 
            width: '100%', 
            height: '100%',
            // [重要] 允许我们选择文本
            allowScriptedContent: true 
          });

          // 5. [批注改造] 监听用户的文本选择事件！这是最关键的一步！
          renditionRef.current.on('selected', (cfiRange, contents) => {
            const selectedText = contents.window.getSelection().toString().trim();
            if (selectedText) {
              setTempAnnotation({ text: selectedText, cfi: cfiRange });
              // 获取选中文本的位置，用于弹出菜单
              const range = contents.window.getSelection().getRangeAt(0);
              const rect = range.getBoundingClientRect();
              setSelectionPopover({ anchorEl: viewerRef.current, rect });
            }
          });

          // 6. [页码改造] 监听位置变化事件
          renditionRef.current.on('relocated', (location) => {
            if (!isMounted || !bookRef.current) return;
            // 通过CFI找到当前所在的章节
            const currentNavItem = bookRef.current.navigation.get(location.start.href);
            setLocation({
              progress: Math.round(location.start.percentage * 100),
              currentChapter: currentNavItem ? currentNavItem.label.trim() : '未知章节'
            });
            // 保存阅读进度
            localStorage.setItem(`book-progress-${bookId}`, location.start.cfi);
          });
          
          // 7. 渲染完成后，加载批注
          renditionRef.current.on('displayed', () => {
            if (isMounted) fetchAndDrawAnnotations();
          });

          // 8. 显示书籍，优先跳转到上次保存的进度
          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          await renditionRef.current.display(savedCfi || undefined);
        }
        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error("加载书籍失败:", err);
        if (isMounted) {
          setError("加载书籍失败，可能文件已损坏或网络错误。");
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

  // [批注改造] 保存用户手写的批注
  const handleSaveAnnotation = async (note) => {
    if (!note.trim()) {
      setSnackbar({ open: true, message: '批注内容不能为空' });
      return;
    }
    try {
      await axios.post(`/books/${bookId}/annotations`, {
        content: note,
        highlighted_text: tempAnnotation.text,
        cfi: tempAnnotation.cfi,
        // 页码是可选的，这里我们就不再强制传递了
      });
      setSnackbar({ open: true, message: '批注已保存' });
      await fetchAndDrawAnnotations(); // 重新加载批注
    } catch (err) {
      setSnackbar({ open: true, message: '保存失败' });
    }
    // 关闭所有相关弹窗
    setAnnotationModal({ open: false });
    setSelectionPopover(null);
    renditionRef.current?.clearSelection(); // 清除页面上的文本选择痕迹
  };

  // [新增] 由Gemini生成批注
  const handleGenerateGeminiAnnotation = async () => {
    setSnackbar({ open: true, message: '正在请求 Gem 为本页生成批注...' });
    setSelectionPopover(null); // 关闭选择菜单
    try {
        const currentPageText = getCurrentPageText();
        if (currentPageText.length < 50) { // 内容太少，不值得分析
            setSnackbar({ open: true, message: '当前页内容太少，无法生成批注' });
            return;
        }

        // [重要] AI批注需要一个锚点，我们就用当前页的起始CFI
        const pageStartCfi = renditionRef.current.currentLocation().start.cfi;
        
        // 调用后端API (注意，后端需要接收cfi)
        const response = await axios.post(`/books/${bookId}/generate-gemini-annotation`, {
            page_content: currentPageText,
            cfi: pageStartCfi // 传递起始CFI
        });

        if (response.data.success) {
            setSnackbar({ open: true, message: 'Gem 批注已生成并保存' });
            await fetchAndDrawAnnotations(); // 刷新批注
        }
    } catch (err) {
        console.error("Gemini annotation generation failed:", err);
        setSnackbar({ open: true, message: err.response?.data?.error || '生成AI批注失败' });
    }
  };

  // [新增] 发送聊天消息
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

  // 删除批注
  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm("确定要删除这条批注吗？")) return;
    try {
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      setSnackbar({ open: true, message: '批注已删除' });
      // 从状态中移除，避免重新请求API，响应更快
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      await fetchAndDrawAnnotations(); // 重新绘制高亮
    } catch (err) {
      setSnackbar({ open: true, message: '删除失败' });
    }
  };

  // 页面导航
  const handleNextPage = useCallback(() => renditionRef.current?.next(), []);
  const handlePrevPage = useCallback(() => renditionRef.current?.prev(), []);
  const onTocClick = (href) => { renditionRef.current?.display(href).then(() => setShowToc(false)); };
  const handleJumpToAnnotation = (cfi) => { renditionRef.current?.display(cfi); setShowAnnotationsPanel(false); };

  // 键盘左右键翻页
  const handleKeyPress = useCallback((event) => {
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
    if (event.key === 'ArrowRight') handleNextPage();
    if (event.key === 'ArrowLeft') handlePrevPage();
  }, [handleNextPage, handlePrevPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  // UI渲染部分
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      {/* 顶部导航栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/reading"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{bookTitle}</Typography>
        <Box>
          <Tooltip title="批注列表"><IconButton onClick={() => setShowAnnotationsPanel(true)}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setShowToc(true)} disabled={!toc || toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      {/* 阅读器主体 */}
      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} >
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /><Typography sx={{ml: 2}}>书籍加载中...</Typography></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        <Box ref={viewerRef} sx={{ position: 'absolute', height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible' }} />
        {!isLoading && !error && (
          <>
            <Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 1, WebkitTapHighlightColor: 'transparent' }} />
            <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 1, WebkitTapHighlightColor: 'transparent' }} />
          </>
        )}
      </Box>

      {/* [批注改造] 选中文本后弹出的菜单 */}
      <Popover
        open={Boolean(selectionPopover)}
        anchorReference="anchorPosition"
        anchorPosition={selectionPopover ? { top: selectionPopover.rect.top + selectionPopover.rect.height, left: selectionPopover.rect.left } : undefined}
        onClose={() => setSelectionPopover(null)}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Paper sx={{ p: 1, display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<CreateIcon />} onClick={() => setAnnotationModal({ open: true })}>
            批注
          </Button>
          <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateGeminiAnnotation}>
            Gem一下
          </Button>
        </Paper>
      </Popover>

      {/* 底部进度条 */}
      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary" noWrap sx={{px: 2}}>{location.currentChapter}</Typography>
        <LinearProgress variant="determinate" value={location.progress} />
      </Box>
      
      {/* 批注输入弹窗 */}
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
      
      {/* 批注列表 */}
      <Drawer anchor="right" open={showAnnotationsPanel} onClose={() => setShowAnnotationsPanel(false)}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {annotations.length > 0 ? annotations.map((anno) => (
              <ListItem key={anno.id} secondaryAction={ <IconButton edge="end" onClick={() => handleDeleteAnnotation(anno.id)}> <DeleteIcon /> </IconButton> } disablePadding >
                <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                  <ListItemText 
                    primary={anno.highlighted_text} 
                    secondary={anno.content}
                    primaryTypographyProps={{ style: { color: anno.is_gemini_annotation ? 'royalblue' : 'inherit' } }}
                  />
                </ListItemButton>
              </ListItem>
            )) : <Typography color="text.secondary">还没有任何批注。</Typography>}
          </List>
        </Box>
      </Drawer>

      {/* 目录 */}
      <Drawer anchor="right" open={showToc} onClose={() => setShowToc(false)}>
        <Box sx={{ width: {xs: '90vw', sm: 300} }}>
          <Typography variant="h6" sx={{p: 2}}>目录</Typography>
          <List>{toc.map((item, index) => (
              <ListItem key={index} disablePadding><ListItemButton onClick={() => onTocClick(item.href)}><ListItemText primary={item.label.trim()} /></ListItemButton></ListItem>
          ))}</List>
        </Box>
      </Drawer>

      {/* 聊天按钮和窗口 */}
      <Fab color="primary" sx={{ position: 'fixed', bottom: 72, right: 16, zIndex: 1200 }} onClick={() => setShowGeminiChat(true)}><ChatIcon /></Fab>
      <GeminiChat open={showGeminiChat} onClose={() => setShowGeminiChat(false)} onSendMessage={handleSendChatMessage} messages={chatMessages} isSending={isChatSending}/>
      
      {/* 全局提示 */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
