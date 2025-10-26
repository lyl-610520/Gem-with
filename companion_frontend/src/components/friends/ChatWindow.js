import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import useFriendChatStore from '../../stores/friendChatStore'; // <-- 1. 导入 store

// --- 复用聊天室UI风格的 Styled Components ---
const ChatWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: ${props => props.theme.borderRadius};
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 15px;
  font-weight: 600;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const MessageList = styled.ul`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  list-style-type: none;
  margin: 0;
  display: flex;
  flex-direction: column;
`;

const MessageItem = styled.li`
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  max-width: 75%;
  align-self: ${props => props.isMine ? 'flex-end' : 'flex-start'};
`;

const MessageBubble = styled.div`
  padding: 0.7rem 1.1rem;
  border-radius: 1.25rem;
  background: ${props => props.isMine ? props.theme.primary : props.theme.cardBg};
  color: ${props => props.isMine ? 'white' : props.theme.text};
  border: 1px solid ${props => props.isMine ? 'transparent' : props.theme.border};
`;

const ChatForm = styled.form`
  display: flex;
  padding: 10px;
  border-top: 1px solid ${props => props.theme.border};
  gap: 10px;
`;

const ChatInput = styled.input`
  flex-grow: 1;
  border: 1px solid ${props => props.theme.border};
  background-color: ${props => props.theme.body};
  padding: 10px 18px;
  border-radius: 30px;
  font-size: 1rem;
`;

const SendButton = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: bold;
  padding: 10px 20px;
  cursor: pointer;
`;

function ChatWindow({ currentUser, chatPartner, socket }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // 2. 从 store 中订阅与当前聊天对象相关的消息
  const messages = useFriendChatStore((state) => state.chats[chatPartner.id] || []);

  useEffect(() => {
    // 消息滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && socket) {
      socket.emit('private_message', {
        recipient_id: chatPartner.id,
        message: input.trim(),
      });
      setInput('');
    }
  };

  return (
    <ChatWrapper>
      <ChatHeader>与 {chatPartner.username} 聊天中</ChatHeader>
      <MessageList>
        {messages.map((msg, index) => (
          <MessageItem key={index} isMine={msg.from_user_id === currentUser.id}>
            <MessageBubble isMine={msg.from_user_id === currentUser.id}>
              {msg.content}
            </MessageBubble>
          </MessageItem>
        ))}
        <div ref={messagesEndRef} />
      </MessageList>
      <ChatForm onSubmit={handleSubmit}>
        <ChatInput value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息..." />
        <SendButton type="submit">发送</SendButton>
      </ChatForm>
    </ChatWrapper>
  );
}

export default ChatWindow;
