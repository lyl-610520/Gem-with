import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaPlay, 
  FaPause, 
  FaStepForward, 
  FaStepBackward, 
  FaVolumeUp,
  FaMusic,
  FaPlus,
  FaHeart,
  FaShare
} from 'react-icons/fa';
import axios from 'axios';

const MusicContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
`;

const AddButton = styled(motion.button)`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  }
`;

const PlayerSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const NowPlaying = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
`;

const AlbumArt = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${props => props.theme.primary}, ${props => props.theme.secondary});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
`;

const TrackInfo = styled.div`
  flex: 1;
`;

const TrackTitle = styled.div`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 5px;
`;

const TrackArtist = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.textLight};
`;

const PlayerControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
`;

const ControlButton = styled.button`
  background: ${props => props.primary ? props.theme.primary : 'transparent'};
  color: ${props => props.primary ? 'white' : props.theme.text};
  border: ${props => props.primary ? 'none' : `2px solid ${props.theme.border}`};
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${props => props.theme.border};
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
`;

const Progress = styled.div`
  height: 100%;
  background: ${props => props.theme.primary};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const TimeDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const PlaylistSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const PlaylistTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
`;

const PlaylistItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.active ? 'rgba(99, 102, 241, 0.1)' : 'transparent'};
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
  }
`;

const TrackNumber = styled.div`
  width: 30px;
  text-align: center;
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const TrackDetails = styled.div`
  flex: 1;
`;

const TrackName = styled.div`
  font-size: 1rem;
  font-weight: 500;
  color: ${props => props.theme.text};
  margin-bottom: 3px;
`;

const TrackDuration = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textLight};
`;

const TrackActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textLight};
  cursor: pointer;
  font-size: 1rem;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: ${props => props.theme.primary};
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: ${props => props.theme.textLight};
`;

// 示例播放列表
const samplePlaylist = [
  { id: 1, title: '夜曲', artist: '周杰伦', duration: '3:45', url: '#' },
  { id: 2, title: '青花瓷', artist: '周杰伦', duration: '3:58', url: '#' },
  { id: 3, title: '稻香', artist: '周杰伦', duration: '3:43', url: '#' },
  { id: 4, title: '告白气球', artist: '周杰伦', duration: '3:35', url: '#' },
  { id: 5, title: '晴天', artist: '周杰伦', duration: '4:29', url: '#' }
];

function Music({ user }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playlist, setPlaylist] = useState(samplePlaylist);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: '这首歌真好听！', isGemini: false, time: '14:30' },
    { id: 2, text: '我也很喜欢这首歌的旋律，很有感觉呢～', isGemini: true, time: '14:31' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 模拟进度更新
    const interval = setInterval(() => {
      if (isPlaying) {
        setProgress(prev => (prev + 1) % 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await axios.post('/music/pause');
      } else {
        await axios.post('/music/play');
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('音乐控制失败:', error);
      setIsPlaying(!isPlaying); // 本地状态更新
    }
  };

  const nextTrack = async () => {
    try {
      await axios.post('/music/next');
      setCurrentTrack((prev) => (prev + 1) % playlist.length);
      setProgress(0);
    } catch (error) {
      console.error('切换歌曲失败:', error);
      setCurrentTrack((prev) => (prev + 1) % playlist.length);
      setProgress(0);
    }
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + playlist.length) % playlist.length);
    setProgress(0);
  };

  const selectTrack = (index) => {
    setCurrentTrack(index);
    setProgress(0);
  };

  const sendMessage = async () => {
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
        text: '这首歌确实很棒！你觉得哪个部分最打动你呢？',
        isGemini: true,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, geminiReply]);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSong = playlist[currentTrack];

  return (
    <MusicContainer>
      <Header>
        <Title>🎵 音乐时光</Title>
        <AddButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaPlus />
          添加歌曲
        </AddButton>
      </Header>

      <PlayerSection>
        <NowPlaying>
          <AlbumArt>
            <FaMusic />
          </AlbumArt>
          <TrackInfo>
            <TrackTitle>{currentSong?.title || '未选择歌曲'}</TrackTitle>
            <TrackArtist>{currentSong?.artist || '未知艺术家'}</TrackArtist>
          </TrackInfo>
        </NowPlaying>

        <PlayerControls>
          <ControlButton onClick={prevTrack}>
            <FaStepBackward />
          </ControlButton>
          <ControlButton primary onClick={togglePlay}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </ControlButton>
          <ControlButton onClick={nextTrack}>
            <FaStepForward />
          </ControlButton>
        </PlayerControls>

        <ProgressBar onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newProgress = (clickX / rect.width) * 100;
          setProgress(newProgress);
        }}>
          <Progress progress={progress} />
        </ProgressBar>

        <TimeDisplay>
          <span>{formatTime(Math.floor(progress * 3.5))}</span>
          <span>{currentSong?.duration || '0:00'}</span>
        </TimeDisplay>
      </PlayerSection>

      <PlaylistSection>
        <PlaylistTitle>播放列表</PlaylistTitle>
        {playlist.map((track, index) => (
          <PlaylistItem
            key={track.id}
            active={index === currentTrack}
            onClick={() => selectTrack(index)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <TrackNumber>{index + 1}</TrackNumber>
            <TrackDetails>
              <TrackName>{track.title}</TrackName>
              <TrackDuration>{track.artist} • {track.duration}</TrackDuration>
            </TrackDetails>
            <TrackActions>
              <ActionButton>
                <FaHeart />
              </ActionButton>
              <ActionButton>
                <FaShare />
              </ActionButton>
            </TrackActions>
          </PlaylistItem>
        ))}
      </PlaylistSection>

      <ChatSection>
        <ChatTitle>💬 与Gemini聊天</ChatTitle>
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
            placeholder="分享你对这首歌的感受..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <SendButton onClick={sendMessage}>
            发送
          </SendButton>
        </ChatInput>
      </ChatSection>
    </MusicContainer>
  );
}

export default Music;