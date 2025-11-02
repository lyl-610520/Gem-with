// src/components/friends/AddFriendComponent.js (全新重构版)
import React, { useState } from 'react';
import { Box, TextField, IconButton, List, ListItem, ListItemAvatar, Avatar, ListItemText, Button, CircularProgress } from '@mui/material';
import { FaSearch } from 'react-icons/fa';
import axios from 'axios';

const AddFriendComponent = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [sentRequests, setSentRequests] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await axios.get(`/users/search?q=${query}`);
      setResults(response.data);
    } catch (error) {
      console.error("搜索用户失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await axios.post('/friends/request', { user_id: userId });
      setSentRequests(prev => ({ ...prev, [userId]: true }));
    } catch (error) {
      alert(error.response?.data?.error || '发送请求失败。');
    }
  };

  return (
    <Box>
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="输入好友的昵称或QQ号"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <IconButton type="submit" color="primary" size="large" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : <FaSearch />}
        </IconButton>
      </Box>
      <List>
        {results.map(user => (
          <ListItem
            key={user.id}
            secondaryAction={
              <Button
                variant="contained"
                onClick={() => handleSendRequest(user.id)}
                disabled={sentRequests[user.id]}
              >
                {sentRequests[user.id] ? '已发送' : '添加好友'}
              </Button>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.light' }}>{user.username.charAt(0).toUpperCase()}</Avatar>
            </ListItemAvatar>
            <ListItemText primary={user.username} secondary={`QQ: ${user.qq_id}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default AddFriendComponent;
