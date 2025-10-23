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
                    // [修正] 使用正确的方式从外部更新Store
                    if (event.data === PlayerState.PLAYING) usePlayerStore.setState({ isPlaying: true });
                    else if (event.data === PlayerState.PAUSED) usePlayerStore.setState({ isPlaying: false });
                    else if (event.data === PlayerState.ENDED) usePlayerStore.setState({ isPlaying: false });
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

  // VVVV YouTube 专属超能力 (修正版) VVVV
  playYouTubeTrack: (song) => {
    if (!youtubePlayer) {
        initializeYoutubePlayer();
        if(!youtubePlayer){
            alert("YouTube播放器尚未准备好，请稍等或尝试刷新页面。");
            return;
        }
    }
    audio.pause();
    if (get().source === 'spotify' && spotifyPlayer) spotifyPlayer.pause();
    youtubePlayer.loadVideoById(song.videoId); 
    set({
      isActive: true, isPlaying: true, isPlayerVisible: true,
      trackInfo: {
        id: song.videoId, name: song.title, artist: song.artist,
        albumCover: song.thumbnail, duration: 0, uri: `youtube:${song.videoId}`,
      },
      currentTime: 0, source: 'youtube',
    });
    setTimeout(() => {
        if (youtubePlayer && typeof youtubePlayer.getDuration === 'function') {
             // [修正] 使用正确的方式从外部更新Store
             usePlayerStore.setState(state => ({
                trackInfo: { ...state.trackInfo, duration: youtubePlayer.getDuration() }
            }));
        }
    }, 1500);
  },
  // ^^^^ [新增结束] ^^^^
  
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

    if (trackInfo.id === song.id && source === 'local') {
      get().togglePlay();
      return;
    }
    
    // 如果当前正在播放 Spotify 音乐，先断开连接
    if (spotifyPlayer) {
        spotifyPlayer.pause();
    }
    
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
      isPlayerVisible: true,
      trackInfo: {
        id: song.id,
        name: song.title,
        artist: song.artist,
        albumCover: '', // 本地音乐无封面
        duration: 0,
        uri: audio.src,
      },
      currentTime: 0,
      source: 'local',
    });
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
