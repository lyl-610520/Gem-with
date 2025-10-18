// src/stores/playerStore.js

import { create } from 'zustand';

// 这个 store 是我们音乐功能的全局“大脑”
const usePlayerStore = create((set) => ({
  // --- 状态 (State) ---
  isActive: false,      // 播放器是否处于活动状态（有歌曲加载）
  isPlaying: false,     // 当前是否正在播放
  trackInfo: {
    id: null,
    name: '',
    artist: '',
    albumCover: '',
    durationMs: 0,
    uri: null, // Spotify URI for Spotify tracks
  },
  progress: 0,          // 播放进度 (0 to 1)
  source: null,         // 音乐来源: 'spotify' or 'local'

  // --- 操作 (Actions) ---

  // 开始播放一首歌（无论是本地还是Spotify）
  playTrack: (trackData, source) => set({
    isActive: true,
    isPlaying: true,
    trackInfo: {
      id: trackData.id,
      name: trackData.name,
      artist: trackData.artist,
      albumCover: trackData.albumCover,
      durationMs: trackData.durationMs,
      uri: trackData.uri,
    },
    progress: 0,
    source: source,
  }),

  // 切换播放/暂停状态
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // 暂停播放
  pause: () => set({ isPlaying: false }),
  
  // 恢复播放
  resume: () => set({ isPlaying: true }),

  // 更新播放进度
  setProgress: (newProgress) => set({ progress: newProgress }),

  // 停止并完全重置播放器
  stop: () => set({
    isActive: false,
    isPlaying: false,
    trackInfo: { id: null, name: '', artist: '', albumCover: '', durationMs: 0, uri: null },
    progress: 0,
    source: null,
  }),
}));

export default usePlayerStore;
