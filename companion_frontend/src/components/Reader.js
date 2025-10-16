import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Epub from 'epubjs';
import axios from 'axios';

// 从 @mui/material 导入所有需要的UI组件
import {
  Box, IconButton, Typography, CircularProgress, LinearProgress, Drawer,
  List, ListItem, ListItemText, Alert, Fab, Button, TextField,
  Paper, InputBase, Avatar, Tooltip, Snackbar,
  ListItemButton,
} from '@mui/material';

// 从 @mui/icons-material 导入所有需要的图标
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import NotesIcon from '@mui/icons-material/Notes';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CreateIcon from '@mui/icons-material/Create';


/**
 * GeminiChat 组件
 * 这部分是独立的聊天UI，与阅读器核心逻辑解耦，所以保持原样即可。
 */
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


/**
 * Reader 组件
 * 这是重构后的核心阅读器组件
 */
function Reader() {
  const { bookId } = useParams();

  // --- 核心 Refs ---
  // Refs 用于存储那些不直接触发UI重新渲染的实例或变量，例如第三方库的实例或DOM节点。
  const bookRef = useRef(null);      // 存储 Epub.js 的 book 实例
  const renditionRef = useRef(null); // 存储 Epub.js 的 rendition 实例
  const viewerRef = useRef(null);    // 指向渲染 EPUB 的 DOM 元素的引用
  const touchState = useRef({ startX: 0, currentX: 0, isSwiping: false }); // 存储滑动状态，避免在滑动过程中触发不必要的渲染

  // --- 核心 State ---
  // State 用于存储所有需要触发UI更新的数据。这是React数据驱动UI的核心。
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookDetails, setBookDetails] = useState({ title: '加载中...', toc: [] });
  const [annotations, setAnnotations] = useState([]); // 【核心改造】用State管理所有批注，替代原来的`useRef` + `forceRender`方案
  const [location, setLocation] = useState({ progress: 0, currentChapter: '加载中...' });

  // --- UI State ---
  // 专门用于控制UI显示状态的 State
  const [selectionMenu, setSelectionMenu] = useState(null); // 控制划词后的小菜单
  const [annotationModal, setAnnotationModal] = useState({ open: false, cfi: '', text: '' }); // 控制添加批注的弹窗
  const [activePanels, setActivePanels] = useState({ toc: false, annotations: false, chat: false }); // 统一管理所有侧边栏/抽屉的开关状态
  const [snackbar, setSnackbar] = useState({ open: false, message: '' }); // 控制页面底部的消息提示

  // --- Gemini Chat State ---
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);

  /**
   * ===================================================================================
   * useEffect 钩子: 处理组件的生命周期和副作用
   * ===================================================================================
   */

  // 【重构】Effect 1: 初始化和加载书籍
  // 这个 effect 只在 `bookId` 改变时运行。它负责获取书籍数据、初始化 Epub.js 并进行首次渲染。
  useEffect(() => {
    // AbortController 用于在组件卸载时取消正在进行的网络请求，这是现代React中处理异步副作用清理的最佳实践。
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

        // 使用 Promise.all 并行获取书籍详情（含批注）和文件内容，提高加载速度
        const [detailsRes, fileRes] = await Promise.all([
          axios.get(`/api/books/${bookId}`, { signal: abortController.signal }),
          axios.get(`/api/books/${bookId}/file`, { responseType: 'arraybuffer', signal: abortController.signal })
        ]);

        // 初始化书籍
        const book = Epub(fileRes.data);
        bookRef.current = book;
        await book.ready;
        
        // 解析元数据和目录
        const meta = await book.loaded.metadata;
        setBookDetails({ title: meta.title, toc: book.navigation.toc });
        
        // 【核心改造】从API获取批注后，直接存入React State
        setAnnotations(detailsRes.data.annotations || []);

        // 渲染书籍到视图
        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            manager: "default",
            flow: "paginated",
            width: '100%',
            height: '100%',
          });
          renditionRef.current = rendition;

          // 自定义主题，定义高亮样式
          rendition.themes.register("custom", {
            "rules": {
              ".user-highlight": { "fill": "rgba(255, 255,0, 0.4) !important", "fill-opacity": "1", "mix-blend-mode": "multiply" },
              ".gemini-highlight": { "fill": "rgba(135, 206, 250, 0.4) !important", "fill-opacity": "1", "mix-blend-mode": "multiply" },
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

          // 加载上次阅读进度
          const savedCfi = localStorage.getItem(`book-progress-${bookId}`);
          rendition.display(savedCfi || undefined);

          // 【关键】当书籍的初始内容显示完成后，才开始绘制所有批注的高亮
          // 注意：我们将绘制逻辑移到了另一个effect中，这里只负责初次显示。
        }
      } catch (err) {
        // 如果错误是由于组件卸载（请求被取消）导致的，则忽略
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

    // 清理函数：在组件卸载时执行
    return () => {
      abortController.abort(); // 取消所有正在进行的网络请求
      renditionRef.current?.destroy(); // 销毁Epub.js的rendition实例，释放内存
      bookRef.current?.destroy();      // 销毁Epub.js的book实例
    };
  }, [bookId]); // 这个 effect 的依赖是 bookId，意味着只有当URL中的书籍ID变化时，才会重新执行整个加载流程。

  // 【新增】Effect 2: 同步批注状态与高亮显示
  // 这个 effect 专门负责将 `annotations` state 的变化同步到 EPUB 视图上。
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !rendition.display) return;

    // 首先，清除当前页面上所有旧的高亮
    // `annotations.remove` 的第二个参数 "highlight" 指的是类型
    rendition.annotations.each(anno => {
        rendition.annotations.remove(anno.cfi, 'highlight');
    });

    // 然后，遍历当前 state 中的所有批注，并一一绘制出来
    annotations.forEach(anno => {
      if (anno.cfi) {
        rendition.annotations.add("highlight", anno.cfi, { id: anno.id }, () => {}, 
          anno.is_gemini_annotation ? 'gemini-highlight' : 'user-highlight'
        );
      }
    });
  // 依赖是 `annotations` state。每当 `annotations` 数组发生变化（新增、删除），这个 effect 就会运行，确保视图与数据同步。
  }, [annotations]);


  /**
   * ===================================================================================
   * useCallback 钩子: 缓存函数，优化性能
   * ===================================================================================
   */

  // useCallback 用于缓存函数定义，避免在每次组件渲染时都重新创建函数。
  // 这对于作为依赖项传入 useEffect 或作为 props 传递给子组件的函数尤其重要。
  
  const getCurrentPageText = useCallback(() => {
    if (!renditionRef.current?.manager) return "";
    const contents = renditionRef.current.manager.getContents();
    return contents.length > 0 && contents[0].document ? contents[0].document.body.innerText : "";
  }, []);

  // 处理文本选择事件
  const handleSelection = useCallback((cfiRange, contents) => {
    // 如果正在滑动翻页，则忽略选择事件，防止冲突
    if (touchState.current.isSwiping) return;

    const selection = contents.window.getSelection();
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

  // 处理阅读进度和位置变化
  const handleRelocated = useCallback((location) => {
    if (!bookRef.current || !bookRef.current.navigation) return;

    const chapter = bookRef.current.spine.get(location.start.href);
    let chapterLabel = '未知章节';
    if (chapter) {
      const tocItem = bookRef.current.navigation.toc.find(item => chapter.href.includes(item.href.split('#')[0]));
      if (tocItem) chapterLabel = tocItem.label.trim();
    }
    
    setLocation({
      progress: Math.round(location.start.percentage * 100),
      currentChapter: chapterLabel,
    });
    // 实时保存阅读进度到 localStorage
    localStorage.setItem(`book-progress-${bookId}`, location.start.cfi);
  }, [bookId]); // 依赖 bookId，确保保存的 key 是正确的

  // 【新增】Effect 3: 绑定 Epub.js 核心事件
  // 这个 effect 负责将我们的回调函数绑定到 rendition 的事件上。
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    rendition.on('selected', handleSelection);
    rendition.on('relocated', handleRelocated);
    
    // 清理函数：组件卸载或回调函数变化时，解绑事件监听器
    return () => {
      rendition.off('selected', handleSelection);
      rendition.off('relocated', handleRelocated);
    };
  }, [handleSelection, handleRelocated]); // 依赖于 useCallback 缓存的函数


  // --- 移动端滑动翻页逻辑 ---
  const handleTouchStart = useCallback((e) => {
    // 如果点击的是链接或已有高亮，则不启动滑动，允许用户交互
    if (e.target.tagName === 'A' || e.target.dataset.id) return;
    touchState.current.startX = e.touches[0].clientX;
    touchState.current.currentX = e.touches[0].clientX; // 初始化currentX
    touchState.current.isSwiping = false; // 刚开始触摸，还未形成滑动
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (touchState.current.startX === 0) return; // 如果touchstart被阻止，则不处理move
    touchState.current.currentX = e.touches[0].clientX;
    // 只有当滑动距离超过一定阈值（例如10px）时，才确认为“正在滑动”
    // 这可以防止用户在选择文本时的轻微抖动被误判为翻页
    if (Math.abs(touchState.current.currentX - touchState.current.startX) > 10) {
        touchState.current.isSwiping = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current.isSwiping) {
        // 如果不是滑动（即是一次点击），则重置状态
        touchState.current.startX = 0;
        return;
    };

    const deltaX = touchState.current.currentX - touchState.current.startX;
    // 只有当滑动距离大于50像素时才触发翻页，防止误触
    if (Math.abs(deltaX) > 50 && renditionRef.current) {
      if (deltaX < 0) { // 向左滑动
        renditionRef.current.next();
      } else { // 向右滑动
        renditionRef.current.prev();
      }
    }
    // 重置状态
    touchState.current = { startX: 0, currentX: 0, isSwiping: false };
  }, []);

  // 【新增】Effect 4: 绑定触摸和键盘事件
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    // 触摸事件需要绑定到 Epub.js 渲染出的 iframe 内部的 document 上
    const setupTouchListeners = (contents) => {
        const doc = contents.document;
        doc.addEventListener('touchstart', handleTouchStart, { passive: true });
        doc.addEventListener('touchmove', handleTouchMove, { passive: true });
        doc.addEventListener('touchend', handleTouchEnd, { passive: true });
    };
    
    // 键盘事件绑定到全局 document
    const handleKeyPress = (event) => {
        if (annotationModal.open || activePanels.chat) return;
        if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
        if (event.key === 'ArrowRight') renditionRef.current.next();
        if (event.key === 'ArrowLeft') renditionRef.current.prev();
    };
    document.addEventListener('keydown', handleKeyPress);
    
    // `viewAdded` 事件在每个章节（iframe）被添加到视图时触发
    rendition.on('viewAdded', (view) => {
        setupTouchListeners(view.contents);
    });

    return () => {
        document.removeEventListener('keydown', handleKeyPress);
        // 清理 viewAdded 监听器
        // 注意: Epub.js 没有提供简单的方法来移除 viewAdded 中添加的事件监听器，但这在组件销毁时通常不是大问题。
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, annotationModal.open, activePanels.chat]);


  // --- 交互功能函数 ---

  const closeSelectionMenu = () => {
    setSelectionMenu(null);
    // 清除浏览器原生选区，避免在我们的菜单关闭后，系统自带的“复制/粘贴”菜单又弹出来
    renditionRef.current?.getContents().forEach(content => {
      content.window.getSelection()?.removeAllRanges();
    });
  };

  const handleSaveAnnotation = async (note) => {
    if (!note.trim() || !annotationModal.cfi) return;
    try {
      const response = await axios.post(`/api/books/${bookId}/annotations`, {
        content: note,
        highlighted_text: annotationModal.text,
        cfi: annotationModal.cfi,
      });
      // 【核心改造】直接更新State，React会自动触发UI和useEffect的更新
      setAnnotations(prev => [...prev, response.data.annotation]);
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || '保存失败' });
    }
    setAnnotationModal({ open: false, cfi: '', text: '' }); // 关闭并重置弹窗状态
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
      const response = await axios.post(`/api/books/${bookId}/generate-gemini-annotation`, {
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
      await axios.delete(`/api/books/${bookId}/annotations/${annotationId}`);
      // 【核心改造】从State中过滤掉被删除的批注，触发UI和高亮更新
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
      const response = await axios.post(`/api/books/${bookId}/chat`, { message, page_content });
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: "抱歉,我好像出错了..." }]);
    }
    setIsChatSending(false);
  };
  
  // 导航和跳转函数
  const onTocClick = (href) => { renditionRef.current?.display(href).then(() => setActivePanels(p => ({...p, toc: false}))) };
  const handleJumpToAnnotation = (cfi) => { renditionRef.current?.display(cfi).then(() => setActivePanels(p => ({...p, annotations: false}))) };

  /**
   * ===================================================================================
   * JSX 渲染部分
   * ===================================================================================
   */
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      {/* 顶部导航栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.paper', flexShrink: 0, boxShadow: 1, zIndex: 1200 }}>
        <IconButton component={Link} to="/"><HomeIcon /></IconButton>
        <Typography noWrap sx={{flexGrow: 1, textAlign: 'center', fontWeight: 'bold', px: 1}}>{bookDetails.title}</Typography>
        <Box>
          <Tooltip title="批注列表"><IconButton onClick={() => setActivePanels(p => ({...p, annotations: true}))}><NotesIcon /></IconButton></Tooltip>
          <Tooltip title="目录"><IconButton onClick={() => setActivePanels(p => ({...p, toc: true}))} disabled={!bookDetails.toc || bookDetails.toc.length === 0}><MenuIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      {/* 阅读器核心区域 */}
      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }} onClick={(e) => { if (e.target === e.currentTarget) closeSelectionMenu(); }}>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /><Typography sx={{ml: 2}}>书籍加载中...</Typography></Box>}
        {error && !isLoading && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
        
        {/* 【重要】这个div是Epub.js的挂载点。我们不再需要覆盖任何透明层来实现翻页，交互将由触摸事件处理。 */}
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
      
      {/* 添加批注的弹窗 */}
      <Drawer anchor="bottom" open={annotationModal.open} onClose={() => setAnnotationModal({ open: false, cfi: '', text: '' })}>
        <Box p={2} component="form" onSubmit={(e) => { e.preventDefault(); handleSaveAnnotation(e.currentTarget.elements.note.value); }}>
          <Typography variant="subtitle1" noWrap sx={{mb: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>为 “{annotationModal.text}” 添加批注</Typography>
          <TextField name="note" autoFocus margin="dense" label="你的想法..." type="text" fullWidth multiline rows={3} variant="outlined" />
          <Button type="submit" variant="contained" sx={{mt: 1}}>保存</Button>
        </Box>
      </Drawer>
      
      {/* 批注列表抽屉 */}
      <Drawer anchor="right" open={activePanels.annotations} onClose={() => setActivePanels(p => ({...p, annotations: false}))}>
        <Box sx={{ width: {xs: '80vw', sm: 350}, p: 2 }}>
          <Typography variant="h6" sx={{mb: 2}}>所有批注</Typography>
          <List>
            {/* 【核心改造】直接从 state `annotations` 渲染列表 */}
            {annotations.length > 0 ? (
              [...annotations].sort((a,b) => a.cfi.localeCompare(b.cfi)).map((anno) => (
                  <ListItem key={anno.id} secondaryAction={ <IconButton edge="end" onClick={() => handleDeleteAnnotation(anno.id)}> <DeleteIcon /> </IconButton> } disablePadding >
                    <ListItemButton onClick={() => anno.cfi && handleJumpToAnnotation(anno.cfi)}>
                      <ListItemText 
                        primary={anno.highlighted_text} 
                        secondary={anno.content}
                        primaryTypographyProps={{ style: { color: anno.is_gemini_annotation ? 'royalblue' : 'inherit', fontStyle: 'italic', opacity: 0.8 } }}
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

      {/* 浮动操作按钮和聊天窗口 */}
      <Fab color="primary" sx={{ position: 'fixed', bottom: 72, right: 16, zIndex: 1200 }} onClick={() => setActivePanels(p => ({...p, chat: true}))}><ChatIcon /></Fab>
      <GeminiChat open={activePanels.chat} onClose={() => setActivePanels(p => ({...p, chat: false}))} onSendMessage={handleSendChatMessage} messages={chatMessages} isSending={isChatSending}/>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
}

export default Reader;
