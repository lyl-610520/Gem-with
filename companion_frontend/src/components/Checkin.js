import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaCheckCircle, FaCalendarAlt, FaTrophy, FaFire } from 'react-icons/fa';
import axios from 'axios';

const CheckinContainer = styled.div`
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

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
  text-align: center;
`;

const StatIcon = styled.div`
  font-size: 2rem;
  color: ${props => props.theme.primary};
  margin-bottom: 10px;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const CheckinList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const CheckinCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const CheckinHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const CheckinType = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const CheckinDate = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const CheckinContent = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  line-height: 1.5;
  margin-bottom: 10px;
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
  max-width: 500px;
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

const Select = styled.select`
  width: 100%;
  padding: 12px;
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

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
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

const checkinTypes = [
  { value: 'study', label: '学习' },
  { value: 'exercise', label: '运动' },
  { value: 'work', label: '工作' },
  { value: 'reading', label: '阅读' },
  { value: 'meditation', label: '冥想' },
  { value: 'creative', label: '创作' },
  { value: 'social', label: '社交' },
  { value: 'health', label: '健康' }
];

function Checkin({ user }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    checkin_type: '',
    content: ''
  });

  useEffect(() => {
    fetchCheckins();
  }, []);

  const fetchCheckins = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/checkin');
      setCheckins(response.data.checkins);
    } catch (error) {
      console.error('获取打卡记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/checkin', formData);
      await fetchCheckins();
      setShowModal(false);
      setFormData({ checkin_type: '', content: '' });
    } catch (error) {
      console.error('保存打卡失败:', error);
    }
  };

  const openModal = () => {
    setFormData({ checkin_type: '', content: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ checkin_type: '', content: '' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCheckinTypeLabel = (type) => {
    const found = checkinTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  // 计算统计数据
  const todayCheckins = checkins.filter(checkin => {
    const today = new Date().toDateString();
    const checkinDate = new Date(checkin.created_at).toDateString();
    return today === checkinDate;
  }).length;

  const totalCheckins = checkins.length;
  const streak = Math.floor(Math.random() * 7) + 1; // 模拟连续打卡天数

  if (loading) {
    return (
      <CheckinContainer>
        <LoadingSpinner>正在加载打卡记录...</LoadingSpinner>
      </CheckinContainer>
    );
  }

  return (
    <CheckinContainer>
      <Header>
        <Title>✅ 打卡记录</Title>
        <AddButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openModal}
        >
          <FaPlus />
          新打卡
        </AddButton>
      </Header>

      <StatsSection>
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatIcon><FaCheckCircle /></StatIcon>
          <StatValue>{todayCheckins}</StatValue>
          <StatLabel>今日打卡</StatLabel>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatIcon><FaCalendarAlt /></StatIcon>
          <StatValue>{totalCheckins}</StatValue>
          <StatLabel>总打卡数</StatLabel>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatIcon><FaFire /></StatIcon>
          <StatValue>{streak}</StatValue>
          <StatLabel>连续天数</StatLabel>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StatIcon><FaTrophy /></StatIcon>
          <StatValue>{Math.floor(totalCheckins / 7)}</StatValue>
          <StatLabel>完成周数</StatLabel>
        </StatCard>
      </StatsSection>

      {checkins.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📅</EmptyIcon>
          <EmptyText>还没有打卡记录</EmptyText>
          <EmptySubtext>点击"新打卡"按钮，开始记录你的进步吧</EmptySubtext>
        </EmptyState>
      ) : (
        <CheckinList>
          <AnimatePresence>
            {checkins.map((checkin) => (
              <CheckinCard
                key={checkin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CheckinHeader>
                  <CheckinType>{getCheckinTypeLabel(checkin.checkin_type)}</CheckinType>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckinDate>{formatDate(checkin.created_at)}</CheckinDate>
                    <AuthorTag isGemini={checkin.is_gemini_checkin}>
                      {checkin.is_gemini_checkin ? 'Gemini' : '我'}
                    </AuthorTag>
                  </div>
                </CheckinHeader>
                
                {checkin.content && (
                  <CheckinContent>{checkin.content}</CheckinContent>
                )}
              </CheckinCard>
            ))}
          </AnimatePresence>
        </CheckinList>
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
              <ModalTitle>新打卡</ModalTitle>
              
              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label>打卡类型</Label>
                  <Select
                    value={formData.checkin_type}
                    onChange={(e) => setFormData({ ...formData, checkin_type: e.target.value })}
                    required
                  >
                    <option value="">请选择打卡类型</option>
                    {checkinTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label>打卡内容（可选）</Label>
                  <TextArea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="记录一下今天的感受或收获..."
                  />
                </FormGroup>
                
                <ButtonGroup>
                  <Button type="button" onClick={closeModal}>
                    取消
                  </Button>
                  <Button type="submit" primary>
                    完成打卡
                  </Button>
                </ButtonGroup>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </CheckinContainer>
  );
}

export default Checkin;