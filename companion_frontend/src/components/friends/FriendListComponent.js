// src/components/friends/FriendListComponent.js (全新重构版)
import React from 'react';
import { Grid, Card, CardContent, Avatar, Typography, Badge, Box, IconButton, Tooltip } from '@mui/material';
import { FaCommentDots, FaUserMinus } from 'react-icons/fa';
import useFriendChatStore from '../../stores/friendChatStore';

const FriendCard = ({ friend, onChat, onRemove }) => {
  const unreadCount = useFriendChatStore((state) => state.unreadCounts[friend.id] || 0);

  return (
    <Card elevation={2} sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          sx={{
            '& .MuiBadge-dot': {
              backgroundColor: friend.is_online ? '#44b700' : '#9e9e9e',
              width: 12, height: 12, borderRadius: '50%',
              border: `2px solid white`,
            },
          }}
        >
          <Avatar sx={{ width: 80, height: 80, mb: 2, mx: 'auto', bgcolor: 'primary.light' }}>
            {friend.username.charAt(0).toUpperCase()}
          </Avatar>
        </Badge>
        <Typography variant="h6" fontWeight={600}>{friend.username}</Typography>
        <Typography variant="body2" color="text.secondary">QQ: {friend.qq_id}</Typography>
      </CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Tooltip title="开始聊天">
          <IconButton color="primary" onClick={() => onChat(friend)}>
            <Badge badgeContent={unreadCount} color="error">
              <FaCommentDots />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title="移除好友">
          <IconButton onClick={() => onRemove(friend.id)}>
            <FaUserMinus />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
};

const FriendListComponent = ({ onSelectChat, onRemoveFriend, friends }) => {
  if (friends.length === 0) {
    return (
      <Box textAlign="center" p={5}>
        <Typography variant="h6" color="text.secondary">你的好友列表是空的</Typography>
        <Typography color="text.secondary">快去“添加好友”标签页寻找第一个伙伴吧！</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {friends.map(friend => (
        <Grid item xs={12} sm={6} md={4} key={friend.id}>
          <FriendCard friend={friend} onChat={onSelectChat} onRemove={onRemoveFriend} />
        </Grid>
      ))}
    </Grid>
  );
};

export default FriendListComponent;
