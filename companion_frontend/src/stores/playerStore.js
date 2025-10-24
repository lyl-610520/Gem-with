// src/stores/playerStore.js (究极融合最终版)

import { create } from 'zustand';
import { getLocalTrackUrl } from '../api/musicApi';
import { spotifyProxyRequest } from '../api/musicApi'; // 引入代理，用于播放控制

// --- 全局播放器实例 ---
const audio = new Audio(); // 用于播放本地音乐
let spotifyPlayer = null;  // 用于播放 Spotify 音乐，初始为 null
let spotifyDeviceId = null; // Spotify 播放器准备好后会提供一个设备ID
let youtubePlayer = null;  // <--- 新增 YouTube 播放器实例

// 定义播放模式的常量和顺序
const playbackModes = ['list', 'loop', 'shuffle'];

// --- [新增] YouTube Iframe Player 初始化助手 ---
// 这个函数需要放在外面，因为 window.onYouTubeIframeAPIReady 需要访问它
// --- [修正] YouTube Iframe Player 初始化助手 ---
const initializeYoutubePlayer = () => {
    if (youtubePlayer || !document.getElementById('youtube-iframe-placeholder')) return;
    if (window.YT && window.YT.Player) {
        youtubePlayer = new window.YT.Player('youtube-iframe-placeholder', {
            height: '0', width: '0',
            playerVars: { playsinline: 1, controls: 0, modestbranding: 1 },
            events: {
                'onReady': (event) => console.log("YouTube 引擎已就绪。"),
                'onStateChange': (event) => {
                    const store = usePlayerStore.getState();
                    if (store.source !== 'youtube') return;
                    
                    const PlayerState = window.YT.PlayerState;
                    if (event.data === PlayerState.PLAYING) {
                        // VVVV [核心修复] VVVV
                        // 当真正开始播放时，我们才去获取总时长并更新Store！
                        const duration = youtubePlayer.getDuration();
                        usePlayerStore.setState(state => ({ 
                            isPlaying: true,
                            trackInfo: { ...state.trackInfo, duration: duration }
                        }));
                        // ^^^^ [修复结束] ^^^^
                    } else if (event.data === PlayerState.PAUSED) {
                        usePlayerStore.setState({ isPlaying: false });
                    } else if (event.data === PlayerState.ENDED) {
                        const { playbackMode } = usePlayerStore.getState();
                        if (playbackMode === 'loop') {
                            youtubePlayer.seekTo(0, true); // 回到视频开头
                            youtubePlayer.playVideo();     // 再次播放
                        } else {
                            usePlayerStore.setState({ isPlaying: false });
                        }
                    }
                }
            }
        });
    }
};
window.onYouTubeIframeAPIReady = initializeYoutubePlayer;


const usePlayerStore = create((set, get) => ({
  // --- 核心状态 (State) ---
  isActive: false, isPlaying: false,
  trackInfo: { id: null, name: '', artist: '', albumCover: '', duration: 0, uri: null },
  currentTime: 0, source: null, playbackMode: 'list', isPlayerVisible: true,
  isSpotifyPlayerReady: false, 

  // VVVV ============= 【新增：音乐聊天状态】 ============= VVVV
  chatMessages: [], // 用来存储聊天记录

  // Action: 初始化聊天或添加欢迎消息
  initializeChat: (nickname) => {
    // 只有在聊天记录为空时才添加欢迎语，防止重复
    if (get().chatMessages.length === 0) {
      set({
        chatMessages: [{ 
          sender: 'gemini', 
          text: `想聊点什么音乐吗？` 
        }]
      });
    }
  },

  // Action: 添加一条新的聊天消息
  addChatMessage: (message) => {
    set(state => ({
      chatMessages: [...state.chatMessages, message]
    }));
  },
  // ^^^^ =============================================== ^^^^


// VVVV [这里是最终修正版] VVVV
playYouTubeTrack: (song) => {
    // 1. 检查并确保YouTube播放器已就绪
    if (!youtubePlayer) {
        initializeYoutubePlayer(); // 尝试再次初始化
        if(!youtubePlayer){
            alert("YouTube播放器尚未准备好，请稍等或尝试刷新页面。");
            return;
        }
    }
    
    // 2. 暂停其他所有正在运行的引擎，避免声音重叠
    audio.pause();
    if (get().source === 'spotify' && spotifyPlayer) {
        spotifyPlayer.pause();
    }
    
    // 3. 命令YouTube引擎加载并播放新歌
    youtubePlayer.playVideo();
    
    // 4. [核心修正] 立刻更新Store状态，让UI即时响应
    //    我们在这里不再猜测时长，而是将它设为0。
    //    真正的时长将由 onStateChange 事件监听器在稍后精准更新。
    set({
      isActive: true,
      isPlaying: true, // 乐观更新，假设会立刻播放
      isPlayerVisible: true,
      trackInfo: {
        id: song.videoId,
        name: song.title,
        artist: song.artist,
        albumCover: song.thumbnail,
        duration: 0, // <--- 关键！时长初始为0
        uri: `youtube:${song.videoId}`,
      },
      currentTime: 0,
      source: 'youtube',
    });

    // 5. [核心修正] 我们把那个不可靠的 setTimeout 定时器彻底删除了！
    //    所有获取时长的逻辑，现在都已移交给了 initializeYoutubePlayer 函数中的
    //    'onStateChange' 事件处理器，确保了100%的准确性。
},
// ^^^^ [修正结束] ^^^^
  
  // --- 操作 (Actions) ---

  // VVVV [Spotify 专属超能力] VVVV

  /**
   * 初始化 Spotify Web Playback SDK
   * 这是连接 Spotify 播放功能的“开关”
   * @param {string} accessToken - 一个有效的 Spotify Access Token
   */
  initializeSpotifyPlayer: (accessToken) => {
    // 防止重复初始化
    if (spotifyPlayer) {
        console.log("Spotify 播放器已初始化。");
        return;
    }

    // 确保 Spotify SDK 脚本已加载
    if (!window.Spotify) {
        console.error("Spotify SDK尚未加载！请检查 public/index.html 文件。");
        return;
    }

    // 等待 SDK 准备就绪的回调
    window.onSpotifyWebPlaybackSDKReady = () => {
      spotifyPlayer = new window.Spotify.Player({
        name: '陪伴空间', // 在 Spotify 连接设备中显示的名字
        // 这个函数会在SDK需要新token时自动调用
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5 // 默认音量
      });

      // --- 监听播放器的各种事件 ---
      spotifyPlayer.addListener('initialization_error', ({ message }) => console.error('初始化失败:', message));
      spotifyPlayer.addListener('authentication_error', ({ message }) => console.error('认证失败:', message));
      spotifyPlayer.addListener('account_error', ({ message }) => console.error('账户错误:', message));
      spotifyPlayer.addListener('playback_error', ({ message }) => console.error('播放错误:', message));

      // 当播放器成功准备就绪
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Spotify 播放器已就绪，设备 ID:', device_id);
        spotifyDeviceId = device_id; // 保存这个重要的ID
      });

      // 当播放状态发生任何变化时（切歌、暂停、进度等）
      spotifyPlayer.addListener('player_state_changed', state => {
        // 如果状态为空 (例如断开连接)，则不处理
        if (!state) return;
        
        // 将 Spotify 的状态同步到我们的 Zustand store
        set({
          isPlaying: !state.paused,
          trackInfo: {
            id: state.track_window.current_track.id,
            name: state.track_window.current_track.name,
            artist: state.track_window.current_track.artists.map(a => a.name).join(', '),
            albumCover: state.track_window.current_track.album.images[0].url,
            duration: state.duration / 1000, // Spotify 返回的是毫秒
            uri: state.track_window.current_track.uri,
          },
          currentTime: state.position / 1000,
          source: 'spotify',
          isActive: true,
        });
      });

      // 连接播放器！
      spotifyPlayer.connect().then(success => {
          if (success) {
              console.log("Spotify 播放器已成功连接！");
          }
      });
    };
    
    // 如果 SDK 已经 ready，直接调用回调
    if (window.onSpotifyWebPlaybackSDKReady) {
        window.onSpotifyWebPlaybackSDKReady();
    }
  },

  /**
   * 播放一首指定的 Spotify 歌曲
   * @param {string} trackUri - 歌曲的 Spotify URI (例如 "spotify:track:...")
   */
  playSpotifyTrack: (trackUri) => {
    if (!spotifyDeviceId) {
      alert("Spotify播放器尚未准备好，请稍等或尝试刷新页面。");
      return;
    }
    // 先暂停本地音乐，防止双重播放
    audio.pause();

    // 通过我们的后端代理，向 Spotify API 发送播放指令
    spotifyProxyRequest('me/player/play', 'put', {
      uris: [trackUri],
      device_id: spotifyDeviceId, // 指定在我们自己的网页播放器上播放
    });

    // 播放时自动展开全局播放器
    set({ isPlayerVisible: true });
  },

  // ^^^^ [Spotify 专属超能力结束] ^^^^

  // --- 本地音乐 Actions ---
  playLocalSong: (song) => {
    const { trackInfo, source } = get();

    // 1. 如果点击的是同一首歌，就切换播放/暂停状态
    if (trackInfo.id === song.id && source === 'local') {
      get().togglePlay();
      return;
    }
    
    // 2. 暂停其他可能正在播放的音乐引擎，防止声音重叠
    if (spotifyPlayer) {
        spotifyPlayer.pause();
    }
    if (youtubePlayer) {
        youtubePlayer.pauseVideo();
    }
    
    // 3. 更新UI状态，告诉用户我们正在准备加载新歌
    set({
      isActive: true,
      isPlaying: false, // 关键：此时还未播放，所以是 false
      isPlayerVisible: true,
      trackInfo: {
        id: song.id,
        name: song.title,
        artist: song.artist,
        albumCover: '', 
        duration: 0, // 时长初始为 0
        uri: getLocalTrackUrl(song.id),
      },
      currentTime: 0,
      source: 'local',
    });

    // 4. 定义一个【一次性】的事件处理函数
    const onMetadataLoaded = () => {
      // 5. 当元数据加载完毕，我们现在可以安全地播放了
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("音频自动播放被浏览器阻止:", error);
          set({ isPlaying: false }); // 如果播放失败，确保UI状态正确
        });
      }
      // 6.【重要】任务完成，移除这个监听器，防止内存泄漏
      audio.removeEventListener('loadedmetadata', onMetadataLoaded);
    };
    
    // 7. 绑定这个一次性的监听器
    audio.addEventListener('loadedmetadata', onMetadataLoaded);
    
    // 8. 设置音频源并命令浏览器开始加载，这将触发上面的 'loadedmetadata' 事件
    audio.src = getLocalTrackUrl(song.id);
    audio.load();
  },

  // --- 通用 Actions (已升级兼容三种模式) ---
  togglePlay: () => {
    const { isPlaying, isActive, source } = get();
    if (!isActive) return;

    if (source === 'local') {
      isPlaying ? audio.pause() : audio.play();
    } else if (source === 'spotify' && spotifyPlayer) {
      spotifyPlayer.togglePlay();
    } else if (source === 'youtube' && youtubePlayer) {
      isPlaying ? youtubePlayer.pauseVideo() : youtubePlayer.playVideo();
    }
  },
  
  seek: (newTime) => {
    const { trackInfo, source } = get();
    if (trackInfo.duration <= 0) return;
    
    const clampedTime = Math.max(0, Math.min(newTime, trackInfo.duration));

    if (source === 'local') {
      audio.currentTime = clampedTime;
    } else if (source === 'spotify' && spotifyPlayer) {
      spotifyPlayer.seek(clampedTime * 1000);
    } else if (source === 'youtube' && youtubePlayer) {
       youtubePlayer.seekTo(clampedTime, true);
    }
    set({ currentTime: clampedTime });
  },

  // --- 其他 Actions (无需修改) ---

  togglePlaybackMode: () => {
    set(state => {
      const currentModeIndex = playbackModes.indexOf(state.playbackMode);
      const nextModeIndex = (currentModeIndex + 1) % playbackModes.length;
      return { playbackMode: playbackModes[nextModeIndex] };
    });
  },

  togglePlayerVisibility: () => {
    set(state => ({ isPlayerVisible: !state.isPlayerVisible }));
  },

  stop: () => {
    audio.pause();
    audio.src = '';
    if (spotifyPlayer) spotifyPlayer.pause();
    if (youtubePlayer) youtubePlayer.stopVideo(); // [新增] 停止YT播放
    set({
      isActive: false,
      isPlaying: false,
      trackInfo: { id: null, name: '', artist: '', albumCover: '', duration: 0, uri: null },
      currentTime: 0,
      source: null,
    });
  },
}));

// --- [修正] YouTube 进度同步定时器 ---
setInterval(() => {
    const { source, isPlaying } = usePlayerStore.getState();
    if (source === 'youtube' && isPlaying && youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
        // [修正] 使用正确的方式从外部更新Store
        usePlayerStore.setState({ currentTime: youtubePlayer.getCurrentTime() });
    }
}, 1000); 



// --- 本地播放器的事件监听器 ---
audio.addEventListener('play', () => {
    if (usePlayerStore.getState().source === 'local') {
        usePlayerStore.setState({ isPlaying: true });
    }
});
audio.addEventListener('pause', () => {
    if (usePlayerStore.getState().source === 'local') {
        usePlayerStore.setState({ isPlaying: false });
    }
});
audio.addEventListener('loadedmetadata', () => {
    if (usePlayerStore.getState().source === 'local') {
        usePlayerStore.setState(state => ({
            trackInfo: { ...state.trackInfo, duration: audio.duration }
        }));
    }
});
audio.addEventListener('timeupdate', () => {
    if (usePlayerStore.getState().source === 'local') {
        usePlayerStore.setState({ currentTime: audio.currentTime });
    }
});
audio.addEventListener('ended', () => {
  if (usePlayerStore.getState().source === 'local') {
    const { playbackMode } = usePlayerStore.getState();
    if (playbackMode === 'loop') {
      audio.currentTime = 0;
      audio.play();
    } else {
      usePlayerStore.setState({ isPlaying: false });
    }
  }
});
audio.addEventListener('error', (e) => {
    console.error("本地 Audio Element 发生错误:", e);
    if (usePlayerStore.getState().source === 'local') {
        usePlayerStore.getState().stop();
    }
});

export default usePlayerStore;
