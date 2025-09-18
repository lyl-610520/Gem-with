import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaHeart, FaSmile, FaFrown, FaMeh } from 'react-icons/fa';
import axios from 'axios';

const DiaryContainer = styled.div`
  max-width: 800px;
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

const DiaryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DiaryCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const DiaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const DiaryDate = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const DiaryActions = styled.div`
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

const DiaryContent = styled.div`
  font-size: 1rem;
  line-height: 1.6;
  color: ${props => props.theme.text};
  margin-bottom: 15px;
`;

const DiaryMood = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const MoodIcon = styled.div`
  font-size: 1.1rem;
  color: ${props => {
    switch(props.mood) {
      case 'happy': return '#10b981';
      case 'sad': return '#ef4444';
      case 'excited': return '#f59e0b';
      case 'calm': return '#6366f1';
      default: return props.theme.textLight;
    }
  }};
`;

const AuthorTag = styled.span`
  background: ${props => props.isGemini ? '#8b5cf6' : '#6366f1'};
  color: white;
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 30px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.text};
  margin-bottom: 8px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 2px solid ${props => props.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.8);
  color: ${props => props.theme.text};
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const MoodSelector = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 10px;
`;

const MoodOption = styled.button`
  background: ${props => props.selected ? props.theme.primary : 'transparent'};
  color: ${props => props.selected ? 'white' : props.theme.textLight};
  border: 2px solid ${props => props.selected ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  padding: 10px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${props => props.theme.primary};
    color: ${props => props.theme.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.primary ? `
    background: ${props.theme.primary};
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
    }
  ` : `
    background: transparent;
    color: ${props.theme.textLight};
    border: 2px solid ${props.theme.border};
    
    &:hover {
      border-color: ${props.theme.primary};
      color: ${props.theme.primary};
    }
  `}
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: ${props => props.theme.textLight};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.textLight};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 1.2rem;
  margin-bottom: 10px;
`;

const EmptySubtext = styled.div`
  font-size: 0.9rem;
`;

function Diary({ user }) {
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiary, setEditingDiary] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    mood: ''
  });

  useEffect(() => {
    fetchDiaries();
  }, []);

  const fetchDiaries = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/diary?per_page=20');
      setDiaries(response.data.diaries);
    } catch (error) {
      console.error('获取日记失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDiary) {
        // 编辑日记的逻辑
        console.log('编辑日记:', editingDiary.id, formData);
      } else {
        // 创建新日记
        await axios.post('/diary', formData);
        await fetchDiaries();
        setShowModal(false);
        setFormData({ content: '', mood: '' });
      }
    } catch (error) {
      console.error('保存日记失败:', error);
    }
  };

  const handleDelete = async (diaryId) => {
    if (window.confirm('确定要删除这篇日记吗？')) {
      try {
        await axios.delete(`/diary/${diaryId}`);
        await fetchDiaries();
      } catch (error) {
        console.error('删除日记失败:', error);
      }
    }
  };

  const openModal = (diary = null) => {
    setEditingDiary(diary);
    if (diary) {
      setFormData({
        content: diary.content,
        mood: diary.mood || ''
      });
    } else {
      setFormData({ content: '', mood: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiary(null);
    setFormData({ content: '', mood: '' });
  };

  const getMoodIcon = (mood) => {
    switch (mood) {
      case 'happy': return <FaSmile />;
      case 'sad': return <FaFrown />;
      case 'excited': return <FaHeart />;
      case 'calm': return <FaMeh />;
      default: return <FaMeh />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DiaryContainer>
        <LoadingSpinner>正在加载日记...</LoadingSpinner>
      </DiaryContainer>
    );
  }

  return (
    <DiaryContainer>
      <Header>
        <Title>📖 我的日记</Title>
        <AddButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => openModal()}
        >
          <FaPlus />
          写日记
        </AddButton>
      </Header>

      {diaries.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📝</EmptyIcon>
          <EmptyText>还没有日记呢</EmptyText>
          <EmptySubtext>点击"写日记"按钮，开始记录你的美好时光吧</EmptySubtext>
        </EmptyState>
      ) : (
        <DiaryList>
          <AnimatePresence>
            {diaries.map((diary) => (
              <DiaryCard
                key={diary.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DiaryHeader>
                  <DiaryDate>{formatDate(diary.created_at)}</DiaryDate>
                  <DiaryActions>
                    <AuthorTag isGemini={diary.is_gemini_written}>
                      {diary.is_gemini_written ? 'Gemini' : '我'}
                    </AuthorTag>
                    {!diary.is_gemini_written && (
                      <>
                        <ActionButton onClick={() => openModal(diary)}>
                          <FaEdit />
                        </ActionButton>
                        <ActionButton onClick={() => handleDelete(diary.id)}>
                          <FaTrash />
                        </ActionButton>
                      </>
                    )}
                  </DiaryActions>
                </DiaryHeader>
                
                <DiaryContent>{diary.content}</DiaryContent>
                
                {diary.mood && (
                  <DiaryMood>
                    <MoodIcon mood={diary.mood}>
                      {getMoodIcon(diary.mood)}
                    </MoodIcon>
                    <span>心情：{diary.mood}</span>
                  </DiaryMood>
                )}
              </DiaryCard>
            ))}
          </AnimatePresence>
        </DiaryList>
      )}

      <AnimatePresence>
        {showModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle>
                {editingDiary ? '编辑日记' : '写新日记'}
              </ModalTitle>
              
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label>日记内容</Label>
                  <TextArea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="记录今天的心情和想法..."
                    required
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>心情</Label>
                  <MoodSelector>
                    {[
                      { value: 'happy', label: '开心', icon: <FaSmile /> },
                      { value: 'sad', label: '难过', icon: <FaFrown /> },
                      { value: 'excited', label: '兴奋', icon: <FaHeart /> },
                      { value: 'calm', label: '平静', icon: <FaMeh /> }
                    ].map((mood) => (
                      <MoodOption
                        key={mood.value}
                        type="button"
                        selected={formData.mood === mood.value}
                        onClick={() => setFormData({ ...formData, mood: mood.value })}
                      >
                        {mood.icon}
                        {mood.label}
                      </MoodOption>
                    ))}
                  </MoodSelector>
                </FormGroup>
                
                <ButtonGroup>
                  <Button type="button" onClick={closeModal}>
                    取消
                  </Button>
                  <Button type="submit" primary>
                    {editingDiary ? '保存修改' : '发布日记'}
                  </Button>
                </ButtonGroup>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </DiaryContainer>
  );
}

export default Diary;