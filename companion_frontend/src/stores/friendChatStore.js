import { create } from 'zustand';

// 这个 store 将会是管理所有好友聊天状态的“中央大脑”
const useFriendChatStore = create((set, get) => ({
  // 数据结构: { friendId_1: [msg1, msg2], friendId_2: [msg3, msg4] }
  chats: {}, 
  
  // 数据结构: { friendId_1: 3, friendId_2: 0 }
  unreadCounts: {}, 
  
  // 添加一条新消息
  addMessage: (message, currentUserId) => {
    const { from_user_id, to_user_id } = message;
    // 2. 直接使用传入的 currentUserId，不再从 get() 获取
    if (!currentUserId) {
        console.error("addMessage 错误: 必须提供 currentUserId!");
        return; // 如果没有提供ID，直接返回，防止出错
    }
    
    // 确定这条消息属于哪个好友的对话
    const friendId = from_user_id === currentUserId ? to_user_id : from_user_id;

    set((state) => {
      // 拿到与该好友的所有历史消息，如果不存在则为空数组
      const existingMessages = state.chats[friendId] || [];
      // 将新消息加入
      let updatedMessages = [...existingMessages, message];
      
      // 如果消息超过100条，就从最旧的开始删除
      if (updatedMessages.length > 100) {
        updatedMessages = updatedMessages.slice(updatedMessages.length - 100);
      }
      
      // 更新 chats 状态
      const newChats = { ...state.chats, [friendId]: updatedMessages };
      
      // 如果这条消息是别人发来的，并且当前没有正在和他聊天，则增加未读计数
      let newUnreadCounts = { ...state.unreadCounts };
      if (from_user_id === friendId && get().activeChatPartnerId !== friendId) {
        newUnreadCounts[friendId] = (newUnreadCounts[friendId] || 0) + 1;
      }

      return { chats: newChats, unreadCounts: newUnreadCounts };
    });
  },

  // 当用户点开某个聊天窗口时，清除该好友的未读计数
  clearUnreadCount: (friendId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [friendId]: 0 },
    }));
  },

  // 这两个变量需要从外部注入，以便 store 内部逻辑使用
  activeChatPartnerId: null,
  currentUserId: null,
  
  // 提供一个方法让外部组件可以更新这些ID
  setActiveIds: (activeChatPartnerId, currentUserId) => {
    set({ activeChatPartnerId, currentUserId });
  }
}));

export default useFriendChatStore;
