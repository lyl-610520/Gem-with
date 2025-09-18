import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaBookOpen, FaComment, FaHeart, FaBookmark } from 'react-icons/fa';

const ReadingContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 30px;
`;

const BookSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const BookTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 10px;
`;

const BookAuthor = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.textLight};
  margin-bottom: 20px;
`;

const BookContent = styled.div`
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${props => props.theme.text};
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border-left: 4px solid ${props => props.theme.primary};
`;

const AnnotationSection = styled.div`
  margin-top: 20px;
`;

const AnnotationTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 15px;
`;

const AnnotationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const AnnotationItem = styled(motion.div)`
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 15px;
  border-left: 3px solid ${props => props.isGemini ? '#8b5cf6' : '#6366f1'};
`;

const AnnotationContent = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  margin-bottom: 8px;
`;

const AnnotationMeta = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textLight};
  display: flex;
  justify-content: space-between;
`;

const AuthorTag = styled.span`
  background: ${props => props.isGemini ? '#8b5cf6' : '#6366f1'};
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 8px;
`;

const AddAnnotationButton = styled(motion.button)`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  }
`;

const ChatSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  margin-top: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const ChatTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
`;

const ChatMessages = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
`;

const ChatMessage = styled.div`
  margin-bottom: 15px;
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 80%;
  
  ${props => props.isGemini ? `
    background: rgba(139, 92, 246, 0.1);
    margin-left: auto;
    text-align: right;
  ` : `
    background: rgba(99, 102, 241, 0.1);
    margin-right: auto;
  `}
`;

const MessageText = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  line-height: 1.4;
`;

const MessageTime = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.textLight};
  margin-top: 5px;
`;

const ChatInput = styled.div`
  display: flex;
  gap: 10px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: ${props => props.theme.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const SendButton = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(99, 102, 241, 0.3);
  }
`;

// 示例书籍内容
const sampleBook = {
  title: '小王子',
  author: '安托万·德·圣-埃克苏佩里',
  content: `"请给我画一只羊。"小王子说。

我从来没有画过羊，所以我给他画了我从前画过的两幅画中的一幅。那是巨蟒的外图。

"不，不！我不要蟒蛇，它肚子里还有一头象。"

我听了他的话，简直目瞪口呆。他接着说："巨蟒这东西太危险，大象又太占地方。我住的地方非常小，我需要一只羊。给我画一只羊吧。"

我就给他画了。

他专心地看着，随后又说："我不要，这只羊已经病得很重了。给我重新画一只。"

我又画了起来。

我的这位朋友天真可爱地笑了，并且客气地拒绝道："你看，你画的不是小羊，是头公羊，还有犄角呢。"

于是我又重新画了一张。

这幅画同前几幅一样又被拒绝了。

"这一只太老了。我想要一只能活得长的羊。"

我不耐烦了。因为我急于要检修发动机，于是就草草画了这张画，并且匆匆地对他说道：

"这是一只箱子，你要的羊就在里面。"

这时我十分惊奇地看到我的这位小评判员喜笑颜开。他说：

"这正是我想要的，你说这只羊需要很多草吗？"

"问这个干什么？"

"因为我那里地方非常小……"

"我给你画的是一只很小的小羊，地方小也够喂养它的。"

他把脑袋靠近这张画。

"并不像你说的那么小……瞧！它睡着了……"

就这样，我认识了小王子。`
};

const sampleAnnotations = [
  {
    id: 1,
    content: '这句话让我想起了童年时的纯真，小王子对羊的关心很温暖。',
    isGemini: false,
    time: '2小时前'
  },
  {
    id: 2,
    content: '我也被小王子的纯真打动了。他对待每一件事都很认真，这种态度值得我们学习。',
    isGemini: true,
    time: '2小时前'
  }
];

const sampleChatMessages = [
  { id: 1, text: '这本书真的很经典！', isGemini: false, time: '14:30' },
  { id: 2, text: '是的，小王子的故事总是能触动人心。你觉得哪个情节最打动你呢？', isGemini: true, time: '14:31' }
];

function Reading({ user }) {
  const [annotations, setAnnotations] = useState(sampleAnnotations);
  const [chatMessages, setChatMessages] = useState(sampleChatMessages);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      isGemini: false,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');

    // 模拟Gemini回复
    setTimeout(() => {
      const geminiReply = {
        id: Date.now() + 1,
        text: '这个观点很有趣！我也觉得小王子教会了我们很多关于生活的道理。',
        isGemini: true,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, geminiReply]);
    }, 1000);
  };

  const addAnnotation = () => {
    const newAnnotation = {
      id: Date.now(),
      content: '这里写得真好！',
      isGemini: false,
      time: '刚刚'
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  return (
    <ReadingContainer>
      <Title>📚 阅读时光</Title>

      <BookSection>
        <BookTitle>{sampleBook.title}</BookTitle>
        <BookAuthor>作者：{sampleBook.author}</BookAuthor>
        
        <BookContent>
          {sampleBook.content}
        </BookContent>

        <AnnotationSection>
          <AnnotationTitle>📝 批注</AnnotationTitle>
          <AnnotationList>
            {annotations.map((annotation) => (
              <AnnotationItem
                key={annotation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnnotationContent>{annotation.content}</AnnotationContent>
                <AnnotationMeta>
                  <span>{annotation.time}</span>
                  <AuthorTag isGemini={annotation.isGemini}>
                    {annotation.isGemini ? 'Gemini' : '我'}
                  </AuthorTag>
                </AnnotationMeta>
              </AnnotationItem>
            ))}
          </AnnotationList>
          
          <AddAnnotationButton
            onClick={addAnnotation}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaComment />
            添加批注
          </AddAnnotationButton>
        </AnnotationSection>
      </BookSection>

      <ChatSection>
        <ChatTitle>💬 与Gemini讨论</ChatTitle>
        <ChatMessages>
          {chatMessages.map((message) => (
            <ChatMessage key={message.id} isGemini={message.isGemini}>
              <MessageText>{message.text}</MessageText>
              <MessageTime>{message.time}</MessageTime>
            </ChatMessage>
          ))}
        </ChatMessages>
        <ChatInput>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="分享你的阅读感受..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <SendButton onClick={sendMessage}>
            发送
          </SendButton>
        </ChatInput>
      </ChatSection>
    </ReadingContainer>
  );
}

export default Reading;