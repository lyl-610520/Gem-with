// src/components/music/SpotifyPlayer.js
import React from 'react';
import { Box, Typography } from '@mui/material';

function SpotifyPlayer({ user }) {
  return (
    <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h5">Spotify Link Mode</Typography>
      <Typography color="text.secondary">即将上线...</Typography>
    </Box>
  );
}

export default SpotifyPlayer;
