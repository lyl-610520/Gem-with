import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText,
  Button, CircularProgress, Typography, Box, ListItemAvatar, Avatar
} from '@mui/material';
import { FaUserFriends, FaPaperPlane } from 'react-icons/fa';

const LudoInviteModal = ({ open, onClose, socket, roomId }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState(new Set());

  useEffect(() => {
    if (open) {
      const fetchOnlineFriends = async () => {
        setLoading(true);
        try {
          const response = await axios.get('/friends');
          const onlineFriends = response.data.filter(f => f.is_online);
          setFriends(onlineFriends);
        } catch (error) {
          console.error("获取好友列表失败:", error);
        }
        setLoading(false);
      };
      fetchOnlineFriends();
      setInvited(new Set()); // 每次打开都重置已邀请状态
    }
  }, [open]);

  const handleInvite = (friendId) => {
    socket.emit('ludo:invite', {
      room_id: roomId,
      invitee_id: friendId,
    });
    setInvited(prev => new Set(prev).add(friendId));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaUserFriends /> 邀请在线好友
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : friends.length === 0 ? (
          <Typography textAlign="center" p={3}>没有在线的好友哦~</Typography>
        ) : (
          <List>
            {friends.map((friend) => (
              <ListItem key={friend.id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>{friend.username.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={friend.username} />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FaPaperPlane />}
                  onClick={() => handleInvite(friend.id)}
                  disabled={invited.has(friend.id)}
                >
                  {invited.has(friend.id) ? '已邀请' : '邀请'}
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LudoInviteModal;
