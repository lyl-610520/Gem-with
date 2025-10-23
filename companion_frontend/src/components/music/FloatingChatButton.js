// src/components/music/FloatingChatButton.js

import React, { useState } from 'react';
import { Fab, Modal, Box, Tooltip } from '@mui/material';
import { keyframes } from '@mui/system';
import { FaCommentDots } from 'react-icons/fa';
// 我们假设之后会创建一个专门的音乐聊天组件
// import MusicChatView from './MusicChatView'; 

// 呼吸光晕动画
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
`;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 450 }, // 响应式宽度
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: 4,
  boxShadow: 24,
  p: 3,
  outline: 'none',
};

const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="与 Gemini 一起听" placement="left">
        <Fab
          color="primary"
          aria-label="chat with gemini"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 40 }, // 在手机上位置高一点，避免被全局播放器挡住
            right: { xs: 20, sm: 40 },
            animation: `${pulse} 2s infinite`,
          }}
        >
          <FaCommentDots size={22} />
        </Fab>
      </Tooltip>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="music-chat-modal-title"
      >
        <Box sx={modalStyle}>
          {/* 在这里，我们将放入真正的聊天界面组件 */}
          {/* 为了让项目能运行，我们先放个占位符 */}
          <h2 id="music-chat-modal-title">一起听歌 (功能开发中)</h2>
          <p>
            这里将是与 Gemini 聊音乐的专属空间！
          </p>
        </Box>
      </Modal>
    </>
  );
};

export default FloatingChatButton;
