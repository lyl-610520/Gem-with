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

  // --- 核心 Refs ---
  // Refs 用于存储那些不直接触发UI重新渲染的实例或变量，例如第三方库的实例或DOM元素。
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const viewerRef = useRef(null); // DOM元素的引用，用于挂载Epub.js
  const touchState = useRef({ startX: 0, currentX: 0, isSwiping: false }); // 存储滑动状态，避免其变化触发重渲染

  // --- 核心 State ---
  // State 用于存储所有需要触发UI更新的数据。
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookDetails, setBookDetails] = useState({ title: '加载中...', toc: [] });
  // 【核心改造】用State管理批注。任何对批注的增删改都通过 setAnnotations，React会自动更新UI。
  const [annotations, setAnnotations] = useState([]); 
  const [location, setLocation] = useState({ progress: 0, currentChapter: '加载中...' });
  const [isRenditionReady, setIsRenditionReady] = useState(false);

  // --- UI State ---
  const [selectionMenu, setSelectionMenu] = useState(null); // 划词后的小菜单
  const [annotationModal, setAnnotationModal] = useState({ open: false, cfi: '', text: '' });
  const [activePanels, setActivePanels] = useState({ toc: false, annotations: false, chat: false });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // --- Gemini Chat State ---
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);

  // 【重构】初始化和加载书籍的Effect
  useEffect(() => {
    // AbortController 用于在组件卸载时取消正在进行的网络请求，防止内存泄漏和状态更新错误。
    const abortController = new AbortController();
    
    async function loadBook() {
      if (!bookId) {
        setError("未找到书籍ID");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError('');

        // 【修改】移除 /api 前缀
        // 并行获取书籍详情（含批注）和文件内容
        const [detailsRes, fileRes] = await Promise.all([
          axios.get(`/books/${bookId}`, { signal: abortController.signal }),
          axios.get(`/books/${bookId}/file`, { responseType: 'arraybuffer', signal: abortController.signal })
        ]);

        // 初始化书籍
        const book = Epub(fileRes.data);
        bookRef.current = book;
        await book.ready;
        
        const meta = await book.loaded.metadata;
        setBookDetails({ title: meta.title, toc: book.navigation.toc });
        setAnnotations(detailsRes.data.annotations || []);

        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            manager: "default",
            flow: "paginated",
            width: '100%',
            height: '100%',
          });
          renditionRef.current = rendition;

          rendition.themes.register("custom", {
            "rules": {
              ".user-highlight": { "fill": "rgba(255, 255, 0, 0.4) !important", "fill-opacity": "1" },
              ".gemini-highlight": { "fill": "rgba(135, 206, 250, 0.4) !important", "fill-opacity": "1" },
            },
            "body": { 
              "padding": "20px !important", 
              "line-height": "1.7 !important", 
              "font-size": "18px !important",
              "color": "#333 !important",
              "word-wrap": "break-word",
            },
          });
          rendition.themes.select("custom");
          // 监听 'displayed' 事件，这个事件表示书籍内容已成功渲染到屏幕上
          // 这是设置“准备就绪”标志最可靠的时机
          rendition.on('displayed', () => {
            setIsRenditionReady(true);
          });
          
          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          rendition.display(savedCfi || undefined);
        }
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error("加载书籍失败:", err);
          setError("加载书籍失败, 请刷新重试。");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadBook();

    // 清理函数：组件卸载时执行，确保资源被释放
    return () => {
      abortController.abort(); // 取消任何正在进行的网络请求
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
    };
  }, [bookId]); // 这个Effect仅在bookId变化时重新执行

  // 【新增】每当批注列表(state)更新时，这个Effect会负责重新绘制所有高亮
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    // 先移除所有旧的高亮
    // `rendition.annotations.each` 是遍历epubjs内部管理的所有批注
    rendition.annotations.each(anno => {
      // 从视图中移除高亮，但不会影响我们React的state
      rendition.annotations.remove(anno.cfiRange, 'highlight');
    });

    // 基于我们React state中的最新annotations数组，重新绘制所有高亮
    annotations.forEach(anno => {
      if (anno.cfi) {
        const isGemini = anno.is_gemini_annotation;
        const className = isGemini ? 'gemini-highlight' : 'user-highlight';
        rendition.annotations.add("highlight", anno.cfi, { id: anno.id }, () => {}, className, {});
      }
    });
  }, [annotations, isRenditionReady]); // 依赖于annotations state

  // 【useCallback】用于性能优化，确保这些函数在组件重渲染时不会被重新创建，除非其依赖项改变。
  const getCurrentPageText = useCallback(() => {
    if (!renditionRef.current?.manager) return "";
    const contents = renditionRef.current.manager.getContents();
    return contents.length > 0 && contents[0].document ? contents[0].document.body.innerText : "";
  }, []);

  // 【核心改造】处理文本选择事件的回调
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

  // 【核心改造】处理阅读进度和位置变化的回调
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

  // 【新增】将Epub.js的事件监听器注册放入Effect中，确保rendition实例存在后再绑定
  useEffect(() => {
    // 【修复】只有在rendition准备好后才绑定事件
    if (!isRenditionReady || !renditionRef.current) return;
    const rendition = renditionRef.current;
    
    rendition.on('selected', handleSelection);
    rendition.on('relocated', handleRelocated);
    
    return () => {
      // rendition实例可能在组件卸载时已被销毁
      if (rendition.hooks) {
        rendition.off('selected', handleSelection);
        rendition.off('relocated', handleRelocated);
      }
    };
  }, [isRenditionReady, handleSelection, handleRelocated]);

  // --- 移动端滑动翻页逻辑 ---
  const handleTouchStart = useCallback((e) => {
    touchState.current.startX = e.touches[0].clientX;
    touchState.current.currentX = e.touches[0].clientX; // 初始化currentX
    touchState.current.isSwiping = true;
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!touchState.current.isSwiping) return;
    touchState.current.currentX = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current.isSwiping) return;
    const deltaX = touchState.current.currentX - touchState.current.startX;
    // 只有滑动距离大于50像素时才触发翻页，防止因轻微抖动导致的误触
    if (Math.abs(deltaX) > 50 && renditionRef.current) {
      if (deltaX < 0) {
        renditionRef.current.next();
      } else {
        renditionRef.current.prev();
      }
    }
    // 重置状态，为下一次滑动做准备
    touchState.current = { startX: 0, currentX: 0, isSwiping: false };
  }, []);

  // 【新增】将触摸事件绑定到阅读器视图上
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    // 我们需要将事件监听器附加到Epub.js渲染出的iframe窗口上，而不是父页面的div
    const setupListeners = (view) => {
      view.document.addEventListener('touchstart', handleTouchStart, { passive: true });
      view.document.addEventListener('touchmove', handleTouchMove, { passive: true });
      view.document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    const removeListeners = (view) => {
        view.document.removeEventListener('touchstart', handleTouchStart);
        view.document.removeEventListener('touchmove', handleTouchMove);
        view.document.removeEventListener('touchend', handleTouchEnd);
    }

    rendition.on('rendered', setupListeners);
    // 同时也监听视图被移除的事件，以便解绑
    rendition.on('viewDetached', removeListeners);
    
    return () => {
      rendition.off('rendered', setupListeners);
      rendition.off('viewDetached', removeListeners);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  // --- 键盘翻页逻辑 (桌面端) ---
  const handleKeyPress = useCallback((event) => {
    // 如果任何弹窗或输入框处于激活状态，则不进行翻页
    if (annotationModal.open || activePanels.chat || activePanels.annotations || activePanels.toc) return;
    if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

    if (event.key === 'ArrowRight' && renditionRef.current) renditionRef.current.next();
    if (event.key === 'ArrowLeft' && renditionRef.current) renditionRef.current.prev();
  }, [annotationModal.open, activePanels]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // --- 交互功能函数 ---
  const closeSelectionMenu = () => {
    setSelectionMenu(null);
    // 清除浏览器原生选区，避免在我们的自定义菜单旁同时出现系统菜单（复制、粘贴等）
    renditionRef.current?.getContents().forEach(content => {
      content.window.getSelection()?.removeAllRanges();
    });
  };

  const handleSaveAnnotation = async (note) => {
    if (!note.trim() || !annotationModal.cfi) return;
    try {
      // 【修改】移除 /api 前缀
      const response = await axios.post(`/books/${bookId}/annotations`, {
        content: note,
        highlighted_text: annotationModal.text,
        cfi: annotationModal.cfi,
      });
      // 【核心改造】直接更新State，UI会自动响应并触发useEffect重绘高亮
      setAnnotations(prev => [...prev, response.data.annotation]);
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '保存失败' });
    }
    setAnnotationModal({ open: false, cfi: '', text: '' });
  };
  
  const handleGenerateGeminiAnnotation = async () => {
    const pageText = getCurrentPageText();
    if (pageText.length < 50) {
      setSnackbar({ open: true, message: '当前页内容太少,无法生成批注' });
      return;
    }
    const pageStartCfi = renditionRef.current.currentLocation().start.cfi;
    setSnackbar({ open: true, message: '正在请求 Gem 生成批注...' });
    closeSelectionMenu();

    try {
      // 【修改】移除 /api 前缀
      const response = await axios.post(`/books/${bookId}/generate-gemini-annotation`, {
        page_content: pageText,
        cfi: pageStartCfi
      });
      if (response.data.success) {
        setAnnotations(prev => [...prev, response.data.annotation]);
        setSnackbar({ open: true, message: 'Gem 批注已生成' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '生成AI批注失败' });
    }
  };
  
  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm("确定要删除这条批注吗?")) return;
    try {
      // 【修改】移除 /api 前缀
      await axios.delete(`/books/${bookId}/annotations/${annotationId}`);
      // 【核心改造】从State中过滤掉被删除的批注，UI会自动响应
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      setSnackbar({ open: true, message: '批注已删除' });
    } catch (err) {
      setSnackbar({ open: true, message: '删除失败' });
    }
  };

  const handleSendChatMessage = async (message) => {
    setIsChatSending(true);
    setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
    try {
      const page_content = getCurrentPageText();
      // 【修改】移除 /api 前缀
      const response = await axios.post(`/books/${bookId}/chat`, { message, page_content });
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: "抱歉,我好像出错了..." }]);
    }
    setIsChatSending(false);
  };

  const onTocClick = (href) => { renditionRef.current?.display(href).then(() => setActivePanels(p => ({...p, toc: false}))) };
  const handleJumpToAnnotation = (cfi) => { renditionRef.current?.display(cfi).then(() => setActivePanels(p => ({...p, annotations: false}))) };

  // --- JSX 渲染 ---
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      {/* 顶部导航栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1 }}>
        <IconButton component={Link} to="/books"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{bookDetails.title}</Typography>
        <Box>
          <Tooltip title="批注列表"><IconButton onClick={() => setActivePanels(p => ({...p, annotations: true}))}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setActivePanels(p => ({...p, toc: true}))} disabled={!bookDetails.toc || bookDetails.toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      {/* 阅读器核心区域 */}
      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} onClick={(e) => { if(e.target === e.currentTarget) closeSelectionMenu(); }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /><Typography sx={{ml: 2}}>书籍加载中...</Typography></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        {/* 【重要】这个div是Epub.js的挂载点。不再需要覆盖任何透明层来实现翻页。 */}
        <Box ref={viewerRef} sx={{ height: '100%', width: '100%', visibility: isLoading || error ? 'hidden' : 'visible' }} />

        {/* 划词后弹出的菜单 */}
        {selectionMenu && (
          <Paper sx={{ position: 'fixed', top: selectionMenu.top, left: selectionMenu.left, transform: 'translateX(-50%)', zIndex: 1400, display: 'flex', gap: 0.5 }}>
            <Button size="small" startIcon={<CreateIcon />} onClick={() => { setAnnotationModal({ open: true, cfi: selectionMenu.cfi, text: selectionMenu.text }); closeSelectionMenu(); }}>批注</Button>
            <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateGeminiAnnotation}>Gem一下</Button>
            <IconButton size="small" onClick={closeSelectionMenu}><CloseIcon fontSize="small" /></IconButton>
          </Paper>
        )}
      </Box>

      {/* 底部进度条 */}
      <Box sx={{ p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <Typography align="center" variant="body2" color="text.secondary" noWrap sx={{px: 2}}>{location.currentChapter}</Typography>
        <LinearProgress variant="determinate" value={location.progress} />
      </Box>
      
      {/* 添加批注的抽屉 */}
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false, text: '', cfi: '' })}>
        <Box p={2} component="form" onSubmit={(e) => { e.preventDefault(); handleSaveAnnotation(e.currentTarget.elements.note.value); }}>
          <Typography variant="subtitle1" noWrap sx={{mb: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>为 “{annotationModal.text}” 添加批注</Typography>
          <TextField name="note" autoFocus margin="dense" label="你的想法..." type="text" fullWidth multiline rows={3} variant="outlined" />
          <Button type="submit" variant="contained" sx={{mt: 1}}>保存</Button>
        </Box>
      </Drawer>
      
      {/* 批注列表的抽屉 */}
      <Drawer anchor="right" open={activePanels.annotations} onClose={() => setActivePanels(p => ({...p, annotations: false}))}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {/* 【核心改造】直接从 state `annotations` 渲染列表 */}
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

      {/* 目录抽屉 */}
      <Drawer anchor="right" open={activePanels.toc} onClose={() => setActivePanels(p => ({...p, toc: false}))}>
        <Box sx={{ width: {xs: '90vw', sm: 300} }}>
          <Typography variant="h6" sx={{p: 2}}>目录</Typography>
          <List>{bookDetails.toc.map((item, index) => (
              <ListItem key={index} disablePadding><ListItemButton onClick={() => onTocClick(item.href)}><ListItemText primary={item.label.trim()} /></ListItemButton></ListItem>
          ))}</List>
        </Box>
      </Drawer>

      {/* Gemini聊天功能 */}
      <Fab color="primary" sx={{ position: 'fixed', bottom: 72, right: 16, zIndex: 1200 }} onClick={() => setActivePanels(p => ({...p, chat: true}))}><ChatIcon /></Fab>
      <GeminiChat open={activePanels.chat} onClose={() => setActivePanels(p => ({...p, chat: false}))} onSendMessage={handleSendChatMessage} messages={chatMessages} isSending={isChatSending}/>
      
      {/* 全局提示条 */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
