// src/components/friends/FriendsPage.js (MUI 重构版)

import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { FaUserFriends, FaUserPlus, FaEnvelopeOpenText } from 'react-icons/fa';

import FriendListComponent from './FriendListComponent';
import FriendRequestsComponent from './FriendRequestsComponent';
import AddFriendComponent from './AddFriendComponent';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function FriendsPage({ user, socket }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box maxWidth="1200px" mx="auto" p={{ xs: 1, sm: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        💌 好友中心
      </Typography>

      <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={handleChange} variant="fullWidth">
          <Tab icon={<FaUserFriends />} iconPosition="start" label="我的好友" />
          <Tab icon={<FaEnvelopeOpenText />} iconPosition="start" label="好友请求" />
          <Tab icon={<FaUserPlus />} iconPosition="start" label="添加好友" />
        </Tabs>
      </Paper>
      
      <TabPanel value={activeTab} index={0}>
        <FriendListComponent user={user} socket={socket} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <FriendRequestsComponent socket={socket} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <AddFriendComponent />
      </TabPanel>
    </Box>
  );
}

export default FriendsPage;
