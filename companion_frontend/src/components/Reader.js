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

// GeminiChat 组件 (这部分无需修改，保持原样)
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
    // ★ [修改] 使用 annotation.id 作为第三个参数，确保每个高亮都有唯一标识，方便后续操作
    renditionRef.current.annotations.add("highlight", annotation.cfi, { id: annotation.id }, (e) => {
        // 你可以在这里添加点击高亮区域的事件，比如弹出批注内容
        console.log("Highlight clicked", e.target);
    }, className, {});
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

        // 同时获取书籍文件和批注信息，并行处理
        const [fileResponse, detailsResponse] = await Promise.all([
            axios.get(`/api/books/${bookId}/file`, { responseType: 'arraybuffer' }),
            axios.get(`/api/books/${bookId}`)
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

          // ★ [核心修改] 优化 selection 事件处理，确保按钮弹出
          renditionRef.current.on('selected', (cfiRange, contents) => {
            if (!isMounted) return;
            // 使用 setTimeout 确保在浏览器完成选择渲染后再执行
            setTimeout(() => {
                const selection = contents.window.getSelection();
                const selectionText = selection ? selection.toString().trim() : '';

                if (selectionText.length > 0 && renditionRef.current && renditionRef.current.location) {
                    const range = selection.getRangeAt(0);
                    // 使用 epubjs 实例的方法来从 Range 对象生成 CFI，这是最准确的方式
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
                            left: rect.left - viewerRect.left + rect.width / 2, // 居中
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

                // ★ [核心修改] 每次翻页后，重新绘制当前页面的高亮
                // 清除所有旧高亮
                renditionRef.current.annotations.removeall(); 
                // 仅绘制所有已加载的批注
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
  }, [bookId, drawHighlight]); // drawHighlight 是用 useCallback 包裹的，依赖稳定

  const closeSelectionPopover = () => {
    setSelectionPopover(null);
    // 清除文字选择痕迹
    if (renditionRef.current) {
        renditionRef.current.getContents().forEach(content => {
            if (content.window) {
                content.window.getSelection().removeAllRanges();
            }
        });
    }
  };

  // ★ [核心修改] 优化保存逻辑，避免重新获取所有批注，从而防止跳页
  const handleSaveAnnotation = async (note) => {
    if (!note.trim()) {
      setSnackbar({ open: true, message: '批注内容不能为空' });
      return;
    }
    closeSelectionPopover(); // 先关闭弹窗
    try {
      const response = await axios.post(`/api/books/${bookId}/annotations`, {
        content: note,
        highlighted_text: tempAnnotation.text,
        cfi: tempAnnotation.cfi,
      });
      const newAnnotation = response.data.annotation;
      
      // ★ 直接在当前页面上绘制新的高亮
      drawHighlight(newAnnotation); 
      
      // ★ 更新React状态
      setAnnotations(prev => [...prev, newAnnotation]);
      
      setSnackbar({ open: true, message: '批注已保存' });
    } catch (err) {
      console.error("保存批注失败: ", err);
      setSnackbar({ open: true, message: err.response?.data?.error || '保存失败，请检查网络' });
    }
    setAnnotationModal({ open: false });
  };

  // ★ [核心修改] 优化Gemini批注生成逻辑，避免跳页
  const handleGenerateGeminiAnnotation = async () => {
    closeSelectionPopover(); // 立即关闭按钮
    setSnackbar({ open: true, message: '正在请求 Gem 为您生成批注...' });
    
    try {
        const currentPageText = getCurrentPageText();
        if (currentPageText.length < 30) { // 内容太少没意义
            setSnackbar({ open: true, message: '当前页内容太少，无法生成有意义的批注' });
            return;
        }
        // 使用当前视图的起始位置作为批注的CFI
        const pageStartCfi = renditionRef.current.currentLocation().start.cfi;
        
        const response = await axios.post(`/api/books/${bookId}/generate-gemini-annotation`, {
            page_content: currentPageText,
            cfi: pageStartCfi,
            highlighted_text: `[Gemini对本页的批注] ${currentPageText.substring(0, 50)}...` // 给出一个默认的高亮文本
        });
        
        if (response.data.success) {
            const newAnnotation = response.data.annotation;
             // ★ 直接在当前页面上绘制新的高亮
            drawHighlight(newAnnotation);
            // ★ 更新React状态
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
      const response = await axios.post(`/api/books/${bookId}/chat`, { message, page_content });
      setChatMessages(prev => [...prev, { sender: 'gemini', text: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'gemini', text: "抱歉，我好像出错了..." }]);
    }
    setIsChatSending(false);
  };

  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm("确定要删除这条批注吗？")) return;
    try {
      await axios.delete(`/api/books/${bookId}/annotations/${annotationId}`);
      const removedAnnotation = annotations.find(a => a.id === annotationId);
      if(removedAnnotation && renditionRef.current) {
         // ★ [核心修改] 使用CFI和"highlight"类型来精确移除高亮
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

  // ★ [新增] 当弹窗打开时，禁用翻页快捷键
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
        
        {/* ★ 翻页区域优化，弹窗时禁用 */}
        <Box onClick={handlePrevPage} sx={{ position: 'absolute', top: 0, left: 0, width: '25%', height: '100%', zIndex: 9, WebkitTapHighlightColor: 'transparent', cursor: selectionPopover || annotationModal.open ? 'default' : 'pointer' }} />
        <Box onClick={handleNextPage} sx={{ position: 'absolute', top: 0, right: 0, width: '25%', height: '100%', zIndex: 9, WebkitTapHighlightColor: 'transparent', cursor: selectionPopover || annotationModal.open ? 'default' : 'pointer' }} />
      </Box>

      <Popover
        open={Boolean(selectionPopover)}
        anchorReference="anchorPosition"
        anchorPosition={selectionPopover ? { top: selectionPopover.rect.top, left: selectionPopover.rect.left } : undefined}
        onClose={closeSelectionPopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ pointerEvents: 'none' }}
      >
        <Paper sx={{ p: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, pointerEvents: 'auto', borderRadius: '12px' }}>
          <Button size="small" startIcon={<CreateIcon />} onClick={() => { setAnnotationModal({ open: true }); setSelectionPopover(null); }}>
            批注
          </Button>
          <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateGeminiAnnotation}>
            Gem一下
          </Button>
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
