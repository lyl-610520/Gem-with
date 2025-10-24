// src/stores/chatStore.js

import { create } from 'zustand';
import axios from 'axios';

const useChatStore = create((set, get) => ({
  // --- 状态 (State) ---
  messages: [],      // 存储所有聊天记录
  isTyping: false,   // Gemini 是否正在“输入”

  // --- 操作 (Actions) ---

  // 初始化聊天，添加欢迎消息
  initializeChat: (nickname) => {
    if (get().messages.length === 0) {
      set({
        messages: [{
          id: 1,
          text: `你好！我是Gemini，很高兴能在这里陪伴你。有什么想聊的吗？`,
          sender: 'gemini',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }]
      });
    }
  },

  // 发送消息的完整流程
  sendMessage: async (messageText) => {
    // 1. 立即将用户消息添加到UI
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    set(state => ({ messages: [...state.messages, userMessage], isTyping: true }));

    try {
      // 2. 调用后端API
      const response = await axios.post('/chat', { message: messageText });
      
      const geminiMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: 'gemini',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };

      // 3. 接收到回复后，添加到UI
      set(state => ({ messages: [...state.messages, geminiMessage] }));

    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: '抱歉，我现在有点走神了，稍后再试吧。',
        sender: 'gemini',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      set(state => ({ messages: [...state.messages, errorMessage] }));
    } finally {
      // 4. 无论成功与否，都结束“正在输入”状态
      set({ isTyping: false });
    }
  }
}));

export default useChatStore;
