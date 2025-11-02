// src/components/friends/FriendRequestsComponent.js (全新重构版)
import React from 'react';
import { List, ListItem, ListItemAvatar, Avatar, ListItemText, Box, Button, Typography } from '@mui/material';

const FriendRequestsComponent = ({ requests, onAccept, onReject }) => {
  if (requests.length === 0) {
    return (
      <Box textAlign="center" p={5}>
        <Typography variant="h6" color="text.secondary">没有待处理的好友请求</Typography>
      </Box>
    );
  }

  return (
    <List>
      {requests.map(req => (
        <ListItem
          key={req.request_id}
          divider
          secondaryAction={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="success" size="small" onClick={() => onAccept(req.request_id)}>接受</Button>
              <Button variant="outlined" color="error" size="small" onClick={() => onReject(req.request_id)}>拒绝</Button>
            </Box>
          }
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {req.from_user.username.charAt(0).toUpperCase()}
            </Avatar>
          </ListItemAvatar>
          <ListItemText 
            primary={req.from_user.username} 
            secondary={`请求时间: ${new Date(req.created_at).toLocaleString()}`} 
          />
        </ListItem>
      ))}
    </List>
  );
};

export default FriendRequestsComponent;
