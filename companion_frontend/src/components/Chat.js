import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';
import axios from 'axios';

const ChatContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 30px;
`;

const ChatArea = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
  height: 600px;
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const ChatTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const StatusIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  margin-bottom: 20px;
`;

const Message = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  
  ${props => !props.isGemini ? 'flex-direction: row-reverse;' : ''}
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
  flex-shrink: 0;
  
  ${props => props.isGemini ? `
    background: #8b5cf6;
  ` : `
    background: ${props.theme.primary};
  `}
`;

const MessageContent = styled.div`
  max-width: 70%;
  ${props => props.isGemini ? 'text-align: right;' : ''}
`;

const MessageBubble = styled.div`
  background: ${props => props.isGemini ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
  border-radius: 18px;
  padding: 12px 16px;
  margin-bottom: 5px;
  word-wrap: break-word;
`;

const MessageText = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  line-height: 1.4;
`;

const MessageTime = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.textLight};
`;

const TypingIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 4px;
  
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.theme.textLight};
    animation: typing 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0s; }
  }
  
  @keyframes typing {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;

const InputArea = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
`;

const Input = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.border};
  border-radius: 20px;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.8);
  color: ${props => props.theme.text};
  resize: none;
  min-height: 44px;
  max-height: 120px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  &::placeholder {
    color: ${props => props.theme.textLight};
  }
`;

const SendButton = styled(motion.button)`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 5px 15px rgba(99, 102, 241, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.theme.textLight};
`;

const WelcomeIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 15px;
`;

const WelcomeText = styled.div`
  font-size: 1.1rem;
  margin-bottom: 10px;
`;

const WelcomeSubtext = styled.div`
  font-size: 0.9rem;
`;

function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // 添加欢迎消息
    const welcomeMessage = {
      id: 1,
      text: '你好！我是Gemini，很高兴能在这里陪伴你。有什么想聊的吗？',
      isGemini: true,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue.trim(),
      isGemini: false,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setLoading(true);

    try {
      const response = await axios.post('/chat', {
        message: inputValue.trim()
      });

      const geminiMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        isGemini: true,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };

      // 模拟打字效果
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, geminiMessage]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('发送消息失败:', error);
      setIsTyping(false);
      setLoading(false);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: '抱歉，我现在有点累了，稍后再聊吧~',
        isGemini: true,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, errorMessage]);
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <ChatContainer>
      <Title>💬 与Gemini聊天</Title>

      <ChatArea>
        <ChatHeader>
          <StatusIndicator />
          <ChatTitle>Gemini 在线</ChatTitle>
        </ChatHeader>

        <MessagesContainer>
          {messages.length === 0 ? (
            <WelcomeMessage>
              <WelcomeIcon>🌟</WelcomeIcon>
              <WelcomeText>欢迎来到陪伴空间</WelcomeText>
              <WelcomeSubtext>与Gemini开始一段温馨的对话吧</WelcomeSubtext>
            </WelcomeMessage>
          ) : (
            <>
              <AnimatePresence>
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    isGemini={message.isGemini}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Avatar isGemini={message.isGemini}>
                      {message.isGemini ? <FaRobot /> : <FaUser />}
                    </Avatar>
                    <MessageContent isGemini={message.isGemini}>
                      <MessageBubble isGemini={message.isGemini}>
                        <MessageText>{message.text}</MessageText>
                      </MessageBubble>
                      <MessageTime>{message.time}</MessageTime>
                    </MessageContent>
                  </Message>
                ))}
              </AnimatePresence>

              {isTyping && (
                <TypingIndicator
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Avatar isGemini={true}>
                    <FaRobot />
                  </Avatar>
                  <MessageContent isGemini={true}>
                    <MessageBubble isGemini={true}>
                      <TypingDots>
                        <span></span>
                        <span></span>
                        <span></span>
                      </TypingDots>
                    </MessageBubble>
                  </MessageContent>
                </TypingIndicator>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </MessagesContainer>

        <InputArea>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            disabled={loading}
          />
          <SendButton
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaPaperPlane />
          </SendButton>
        </InputArea>
      </ChatArea>
    </ChatContainer>
  );
}

export default Chat;
