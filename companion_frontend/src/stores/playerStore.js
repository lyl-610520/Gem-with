// src/stores/playerStore.js (最终无错版 v3)

import { create } from 'zustand';
import { getLocalTrackUrl } from '../api/musicApi';

const audio = new Audio();

const usePlayerStore = create((set, get) => ({
  // --- 状态 (State) ---
  isActive: false,      
  isPlaying: false,
  
  // --- VVVV 核心修复 VVVV ---
  // 修正了这里的语法错误，提供了完整的初始状态
  trackInfo: {
    id: null,
    name: '',
    artist: '',
    albumCover: '',
    duration: 0, 
    uri: null,
  },
  // --- ^^^^ 修复结束 ^^^^ ---

  currentTime: 0,
  source: null,         

  // --- 操作 (Actions) ---
  playLocalSong: (song) => {
    const { trackInfo, isPlaying, source } = get();

    if (trackInfo.id === song.id && source === 'local') {
      get().togglePlay();
      return;
    }
      
    audio.pause(); 
    audio.src = getLocalTrackUrl(song.id);
    audio.load();

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Audio play was prevented:", error);
        set({ isPlaying: false });
      });
    }

    set({
      isActive: true,
      isPlaying: true, // 假设会立即播放
      trackInfo: {
        id: song.id,
        name: song.title,
        artist: song.artist,
        albumCover: null,
        duration: 0,
        uri: null,
      },
      currentTime: 0,
      source: 'local',
    });
  },
  
  togglePlay: () => {
    const { isPlaying, source, isActive } = get();
    if (!isActive) return; // 如果没有加载任何歌曲，则不执行任何操作

    if (source === 'local') {
      if (isPlaying) {
        audio.pause();
      } else {
        if (audio.src) {
            audio.play().catch(e => console.error("Audio play failed:", e));
        }
      }
    }
    // (Spotify 逻辑稍后添加)
  },

  seek: (newTime) => {
    const { source, trackInfo } = get();
    if (source === 'local' && trackInfo.duration > 0) {
      const clampedTime = Math.max(0, Math.min(newTime, trackInfo.duration));
      audio.currentTime = clampedTime;
      set({ currentTime: clampedTime });
    }
  },

  stop: () => {
    audio.pause();
    audio.src = '';
    set({
      isActive: false,
      isPlaying: false,
      trackInfo: { id: null, name: '', artist: '', albumCover: '', duration: 0, uri: null },
      currentTime: 0,
      source: null,
    });
  },
}));

// --- 事件监听器 (保持不变) ---
audio.addEventListener('play', () => usePlayerStore.setState({ isPlaying: true }));
audio.addEventListener('pause', () => usePlayerStore.setState({ isPlaying: false }));
audio.addEventListener('loadedmetadata', () => {
  usePlayerStore.setState(state => ({
    trackInfo: { ...state.trackInfo, duration: audio.duration }
  }));
});
audio.addEventListener('timeupdate', () => usePlayerStore.setState({ currentTime: audio.currentTime }));
audio.addEventListener('ended', () => {
  usePlayerStore.setState({ isPlaying: false });
});
audio.addEventListener('error', (e) => {
    console.error("Audio Element Error:", e);
    usePlayerStore.getState().stop();
});

export default usePlayerStore;
