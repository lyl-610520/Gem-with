// src/components/music/FloatingChatButton.js (最终修正版)

import React, { useState } from 'react';
import { Fab, Modal, Box, Tooltip } from '@mui/material';
import { keyframes } from '@mui/system';
import { FaCommentDots } from 'react-icons/fa';
import MusicChatView from './MusicChatView';

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
  width: { xs: '90%', sm: 450 },
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: 4,
  boxShadow: 24,
  p: { xs: 2, sm: 3 },
  outline: 'none',
};

// =======================================================
// VVVV               【这里的修改是关键】               VVVV
// =======================================================
// 我们需要在这里通过 props 接收 user 对象
const FloatingChatButton = ({ user }) => { 
// =======================================================
// ^^^^               【修改完毕】                      ^^^^
// =======================================================
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
            bottom: { xs: 80, sm: 40 },
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
          {/* 现在这里的 user 是被正确接收和传递的 */}
          <MusicChatView user={user} />
        </Box>
      </Modal>
    </>
  );
};

export default FloatingChatButton;
