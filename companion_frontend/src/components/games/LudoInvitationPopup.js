import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { FaPaperPlane, FaCheck, FaTimes } from 'react-icons/fa';

const LudoInvitationPopup = ({ invitation, onAccept, onDecline }) => {
  if (!invitation) return null;

  const { inviter } = invitation;

  return (
    <Dialog open={true} onClose={onDecline}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaPaperPlane color="primary" />
        飞行棋游戏邀请
      </DialogTitle>
      <DialogContent>
        <Typography>
          您的好友 <Box component="span" fontWeight="bold" color="primary.main">{inviter.username}</Box> 邀请您加入一局飞行棋游戏！
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDecline} color="error" startIcon={<FaTimes />}>
          拒绝
        </Button>
        <Button onClick={() => onAccept(invitation.room_id)} variant="contained" autoFocus startIcon={<FaCheck />}>
          接受
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LudoInvitationPopup;
