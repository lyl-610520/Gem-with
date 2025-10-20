// src/stores/playerStore.js (增加“可见性”状态)

import { create } from 'zustand';
import { getLocalTrackUrl } from '../api/musicApi';

const audio = new Audio();
const playbackModes = ['list', 'loop', 'shuffle'];

const usePlayerStore = create((set, get) => ({
  // --- 状态 (State) ---
  isActive: false,      
  isPlaying: false,
  trackInfo: {
    id: null,
    name: '',
    artist: '',
    albumCover: '',
    duration: 0,
    uri: null,
  },
  currentTime: 0,
  source: null,
  playbackMode: 'list', 
  
  // VVVV [新增] VVVV
  // 控制播放器UI是否可见（展开/收起）
  isPlayerVisible: true,
  // ^^^^ [新增] ^^^^

  // --- 操作 (Actions) ---
  playLocalSong: (song) => {
    const { trackInfo, source } = get();
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
        console.error("音频自动播放被浏览器阻止:", error);
        set({ isPlaying: false });
      });
    }
    set({
      isActive: true,
      isPlaying: true,
      isPlayerVisible: true, // [新增] 开始播放时，自动展开播放器
      trackInfo: {
        id: song.id,
        name: song.title,
        artist: song.artist,
        albumCover: null,
        duration: 0,
        uri: audio.src,
      },
      currentTime: 0,
      source: 'local',
    });
  },
  
  togglePlay: () => {
    const { isPlaying, isActive } = get();
    if (!isActive) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.src) {
          audio.play().catch(e => console.error("音频播放失败:", e));
      }
    }
  },

  seek: (newTime) => {
    const { trackInfo } = get();
    if (trackInfo.duration > 0) {
      const clampedTime = Math.max(0, Math.min(newTime, trackInfo.duration));
      audio.currentTime = clampedTime;
      set({ currentTime: clampedTime });
    }
  },

  togglePlaybackMode: () => {
    set(state => {
      const currentModeIndex = playbackModes.indexOf(state.playbackMode);
      const nextModeIndex = (currentModeIndex + 1) % playbackModes.length;
      return { playbackMode: playbackModes[nextModeIndex] };
    });
  },

  // VVVV [新增] VVVV
  /**
   * 切换播放器的展开/收起状态
   */
  togglePlayerVisibility: () => {
    set(state => ({ isPlayerVisible: !state.isPlayerVisible }));
  },
  // ^^^^ [新增] ^^^^

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
  const { playbackMode } = usePlayerStore.getState();
  if (playbackMode === 'loop') {
    audio.currentTime = 0;
    audio.play();
  } else {
    usePlayerStore.setState({ isPlaying: false });
  }
});
audio.addEventListener('error', (e) => {
    console.error("Audio Element 发生错误:", e);
    usePlayerStore.getState().stop();
});

export default usePlayerStore;
