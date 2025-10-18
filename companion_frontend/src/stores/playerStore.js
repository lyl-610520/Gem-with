// src/stores/playerStore.js (最终功能版)

import { create } from 'zustand';
import { getLocalTrackUrl } from '../api/musicApi';

// [核心] 我们在 store 外部创建一个 audio 实例，确保全局只有一个播放器核心
// 这能保证在组件切换时，音乐不会中断
const audio = new Audio();

const usePlayerStore = create((set, get) => ({
  // --- 状态 (State) ---
  isActive: false,      
  isPlaying: false,     
  trackInfo: {
    id: null,
    name: '',
    artist: '',
    albumCover: '',
    duration: 0, // 改为秒，更直观
    uri: null,
  },
  currentTime: 0,       // 当前播放时间（秒）
  source: null,         

  // --- 操作 (Actions) ---

  /**
   * [核心] 播放一首本地歌曲
   * @param {object} song - 包含 {id, title, artist} 的歌曲对象
   */
  playLocalSong: (song) => {
    const { trackInfo, isPlaying, source } = get();

    // 如果点击的是同一首歌，并且正在播放，则暂停；否则就播放
    if (trackInfo.id === song.id && source === 'local') {
      get().togglePlay();
      return;
    }
      
    // 停止当前可能正在播放的任何歌曲
    audio.pause(); 
    
    // 设置新的音源
    audio.src = getLocalTrackUrl(song.id);
    audio.load();

    // 开始播放，并处理浏览器可能出现的自动播放限制
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Audio play was prevented:", error);
        // 即使播放失败，我们也要更新UI状态为暂停
        set({ isPlaying: false });
      });
    }

    // 更新全局状态
    set({
      isActive: true,
      isPlaying: true,
      trackInfo: {
        id: song.id,
        name: song.title,
        artist: song.artist,
        albumCover: null, // 本地音乐暂时没有封面
        duration: 0,      // 稍后从 'loadedmetadata' 事件获取
        uri: null,
      },
      currentTime: 0,
      source: 'local',
    });
  },
  
  /**
   * [核心] 统一的播放/暂停控制
   */
  togglePlay: () => {
    const { isPlaying, source } = get();
    if (source === 'local') {
      if (isPlaying) {
        audio.pause();
      } else {
        // 只有在有音源的情况下才能播放
        if (audio.src) {
            audio.play().catch(e => console.error("Audio play failed:", e));
        }
      }
      // set({ isPlaying: !isPlaying }); // 状态由 audio 事件监听器更新，更准确
    }
    // (我们稍后会在这里添加 spotify 的控制逻辑)
  },

  /**
   * [核心] 拖动进度条
   * @param {number} newTime - 新的播放时间（秒）
   */
  seek: (newTime) => {
    const { source } = get();
    if (source === 'local') {
      audio.currentTime = newTime;
      set({ currentTime: newTime });
    }
  },

  // (以下 actions 暂时未使用，但保留框架)
  pause: () => get().togglePlay(),
  resume: () => get().togglePlay(),

  // 停止并完全重置播放器
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


// ==========================================================
//  [关键] 将 audio 元素的事件与 store 的状态连接起来
//  这是实现实时更新的核心
// ==========================================================

// 当音频开始播放时
audio.addEventListener('play', () => {
  usePlayerStore.setState({ isPlaying: true });
});

// 当音频暂停时
audio.addEventListener('pause', () => {
  usePlayerStore.setState({ isPlaying: false });
});

// 当音频的元数据（如时长）加载完毕时
audio.addEventListener('loadedmetadata', () => {
  usePlayerStore.setState(state => ({
    trackInfo: { ...state.trackInfo, duration: audio.duration }
  }));
});

// 当播放时间更新时（高频触发）
audio.addEventListener('timeupdate', () => {
  usePlayerStore.setState({ currentTime: audio.currentTime });
});

// 当歌曲播放结束时
audio.addEventListener('ended', () => {
  usePlayerStore.setState({ isPlaying: false });
  // (可以在这里添加自动播放下一首的逻辑)
  // const { nextTrack } = usePlayerStore.getState();
  // nextTrack(); 
});

// 当加载音频出错时
audio.addEventListener('error', (e) => {
    console.error("Audio Element Error:", e);
    usePlayerStore.getState().stop();
});

export default usePlayerStore;
