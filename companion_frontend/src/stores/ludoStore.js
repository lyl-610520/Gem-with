import { create } from 'zustand';

const useLudoStore = create((set, get) => ({
  // --- State ---
  isConnected: false,     // Socket是否连接
  inRoom: false,          // 是否在房间内
  room: null,             // 房间的完整信息 { id, host_id, players, status }
  gameState: null,        // 游戏的核心状态
  invitation: null,       // 收到的游戏邀请

  // --- Actions ---
  
  // 连接和断开
  setConnected: (status) => set({ isConnected: status }),

  // 房间和游戏状态更新
  updateRoom: (roomData) => set({ 
    inRoom: !!roomData, // 如果 roomData 为 null 或 undefined，则 inRoom 为 false
    room: roomData,
    // 如果房间数据里没有游戏状态，不清空旧的，等待 game_state_update
  }),

  updateGameState: (gameStateData) => set({ 
    gameState: gameStateData 
  }),

  // 处理邀请
  setInvitation: (invitationData) => set({ invitation: invitationData }),
  clearInvitation: () => set({ invitation: null }),

  // 重置/离开房间
  reset: () => set({
    inRoom: false,
    room: null,
    gameState: null,
  }),
  
  // --- Getters (方便在组件外或 action 内部使用) ---
  isHost: () => {
    const { room } = get();
    // 假设 user.id 在其他地方获取，这里我们简单地检查
    // 在组件中我们会传入当前 user_id 进行比较
    return room?.host_id; 
  },
}));

export default useLudoStore;
