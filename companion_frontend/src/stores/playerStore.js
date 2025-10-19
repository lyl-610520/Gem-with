// src/stores/playerStore.js (最终完整版)

import { create } from 'zustand';
// 注意：getLocalTrackUrl 仍然需要，因为你的 playLocalSong 函数还在使用它
import { getLocalTrackUrl } from '../api/musicApi';

// 创建一个全局唯一的 Audio 实例，所有组件都将通过 store 控制这一个播放器
const audio = new Audio();

// 定义播放模式的常量和顺序，方便切换
const playbackModes = ['list', 'loop', 'shuffle'];

const usePlayerStore = create((set, get) => ({
  // --- 状态 (State) ---
  // 播放器是否处于激活状态（即列表中有歌曲被加载）
  isActive: false,      
  // 当前是否正在播放
  isPlaying: false,
  // 当前播放曲目的详细信息
  trackInfo: {
    id: null,
    name: '',
  
    artist: '',
    albumCover: '', // 专辑封面，为 Spotify 预留
    duration: 0,    // 总时长，单位秒
    uri: null,      // 音频源地址
  },
  // 当前播放进度，单位秒
  currentTime: 0,
  // 音频来源，'local' 或 'spotify'
  source: null,
  // [新增] 播放模式，默认为 'list' (列表循环)
  playbackMode: 'list', 

  // --- 操作 (Actions) ---

  /**
   * 播放一首本地音乐
   * @param {object} song - 包含 id, title, artist 等信息的歌曲对象
   */
  playLocalSong: (song) => {
    const { trackInfo, source } = get();

    // 如果点击的是同一首歌，则只切换播放/暂停状态
    if (trackInfo.id === song.id && source === 'local') {
      get().togglePlay();
      return;
    }
    
    // 如果是新歌，则重置播放器并加载新音源
    audio.pause(); 
    audio.src = getLocalTrackUrl(song.id);
    audio.load(); // 重新加载音频

    // 调用 play() 会返回一个 Promise，我们需要处理可能出现的自动播放失败异常
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("音频自动播放被浏览器阻止:", error);
        set({ isPlaying: false }); // 如果播放失败，确保状态同步
      });
    }

    // 更新 store 中的状态，让 UI 实时响应
    set({
      isActive: true,
      isPlaying: true, // 乐观更新，假设会立即播放
      trackInfo: {
        id: song.id,
        name: song.title,
        artist: song.artist,
        albumCover: null, // 本地音乐暂时没有专辑封面
        duration: 0,      // 时长将在 'loadedmetadata' 事件中更新
        uri: audio.src,   // 存储当前的音源地址
      },
      currentTime: 0,   // 新歌从头开始
      source: 'local',
    });
  },
  
  /**
   * 切换播放/暂停状态
   */
  togglePlay: () => {
    const { isPlaying, isActive } = get();
    if (!isActive) return; // 如果没有加载任何歌曲，则不执行任何操作

    if (isPlaying) {
      audio.pause();
    } else {
      // 确保有音源再播放
      if (audio.src) {
          audio.play().catch(e => console.error("音频播放失败:", e));
      }
    }
    // isPlaying 状态会由下面的 'play'/'pause' 事件监听器自动更新
  },

  /**
   * 跳转到指定播放时间
   * @param {number} newTime - 新的播放时间（秒）
   */
  seek: (newTime) => {
    const { trackInfo } = get();
    if (trackInfo.duration > 0) {
      // 确保跳转时间在合法范围内 [0, duration]
      const clampedTime = Math.max(0, Math.min(newTime, trackInfo.duration));
      audio.currentTime = clampedTime;
      set({ currentTime: clampedTime }); // 同步状态
    }
  },

  /**
   * [新增] 切换播放模式
   */
  togglePlaybackMode: () => {
    set(state => {
      const currentModeIndex = playbackModes.indexOf(state.playbackMode);
      const nextModeIndex = (currentModeIndex + 1) % playbackModes.length; // 循环切换
      return { playbackMode: playbackModes[nextModeIndex] };
    });
  },

  /**
   * 完全停止并重置播放器
   */
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

// --- 全局音频事件监听器 ---
// 这些监听器确保了无论音频如何被操作（即使是在浏览器开发者工具里），
// 我们的 Zustand store 状态都能保持同步。

// 当音频开始播放时
audio.addEventListener('play', () => usePlayerStore.setState({ isPlaying: true }));

// 当音频暂停时
audio.addEventListener('pause', () => usePlayerStore.setState({ isPlaying: false }));

// 当音频元数据（如时长）加载完成后
audio.addEventListener('loadedmetadata', () => {
  usePlayerStore.setState(state => ({
    trackInfo: { ...state.trackInfo, duration: audio.duration }
  }));
});

// 当播放进度更新时
audio.addEventListener('timeupdate', () => usePlayerStore.setState({ currentTime: audio.currentTime }));

// 当一首歌播放结束时
audio.addEventListener('ended', () => {
  const { playbackMode } = usePlayerStore.getState();
  if (playbackMode === 'loop') {
    // 如果是单曲循环模式，回到起点并重新播放
    audio.currentTime = 0;
    audio.play();
  } else {
    // 其他模式（列表、随机）暂时先暂停
    // 未来在这里实现播放下一首的逻辑
    usePlayerStore.setState({ isPlaying: false });
  }
});

// 当音频加载或播放发生错误时
audio.addEventListener('error', (e) => {
    console.error("Audio Element 发生错误:", e);
    // 发生错误时重置播放器，避免UI卡在错误状态
    usePlayerStore.getState().stop();
});

export default usePlayerStore;
