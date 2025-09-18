import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaBook, 
  FaCheckCircle, 
  FaMusic, 
  FaBookOpen, 
  FaGamepad, 
  FaComments,
  FaCalendarAlt,
  FaHeart,
  FaStar
} from 'react-icons/fa';
import axios from 'axios';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const WelcomeSection = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 10px;
  background: linear-gradient(135deg, ${props => props.theme.primary}, ${props => props.theme.secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${props => props.theme.textLight};
  margin-bottom: 20px;
`;

const StatsGrid = styled.div`
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

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ActionCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
`;

const ActionIcon = styled.div`
  font-size: 2.5rem;
  color: ${props => props.theme.primary};
  margin-bottom: 15px;
`;

const ActionTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 10px;
`;

const ActionDescription = styled.p`
  font-size: 0.95rem;
  color: ${props => props.theme.textLight};
  line-height: 1.5;
`;

const RecentActivity = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const ActivityTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div`
  font-size: 1.2rem;
  color: ${props => props.theme.primary};
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityText = styled.div`
  font-size: 0.95rem;
  color: ${props => props.theme.text};
  margin-bottom: 5px;
`;

const ActivityTime = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.textLight};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: ${props => props.theme.textLight};
`;

function Dashboard({ user }) {
  const [stats, setStats] = useState({
    diaries: 0,
    checkins: 0,
    games: 0,
    streak: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取统计数据
      const [diariesRes, checkinsRes, gamesRes] = await Promise.all([
        axios.get('/diary?per_page=1'),
        axios.get('/checkin'),
        axios.get('/games/scores')
      ]);

      setStats({
        diaries: diariesRes.data.total || 0,
        checkins: checkinsRes.data.checkins.length || 0,
        games: gamesRes.data.scores.length || 0,
        streak: Math.floor(Math.random() * 7) + 1 // 模拟连续打卡天数
      });

      // 获取最近活动
      const activities = [];
      
      if (diariesRes.data.diaries.length > 0) {
        activities.push({
          icon: FaBook,
          text: '写了一篇新日记',
          time: '2小时前',
          type: 'diary'
        });
      }
      
      if (checkinsRes.data.checkins.length > 0) {
        activities.push({
          icon: FaCheckCircle,
          text: '完成了今日打卡',
          time: '1小时前',
          type: 'checkin'
        });
      }
      
      activities.push({
        icon: FaGamepad,
        text: '玩了一局记忆游戏',
        time: '3小时前',
        type: 'game'
      });

      setRecentActivity(activities);
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: FaBook,
      title: '写日记',
      description: '记录今天的心情和想法，与Gemini分享你的故事',
      path: '/diary'
    },
    {
      icon: FaCheckCircle,
      title: '打卡',
      description: '完成今日目标，保持好习惯',
      path: '/checkin'
    },
    {
      icon: FaMusic,
      title: '听音乐',
      description: '与Gemini一起享受美妙的音乐时光',
      path: '/music'
    },
    {
      icon: FaBookOpen,
      title: '阅读',
      description: '一起读书，分享阅读心得',
      path: '/reading'
    },
    {
      icon: FaGamepad,
      title: '小游戏',
      description: '放松一下，玩个有趣的小游戏',
      path: '/games'
    },
    {
      icon: FaComments,
      title: '聊天',
      description: '与Gemini聊聊天，分享你的想法',
      path: '/chat'
    }
  ];

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingSpinner>正在加载仪表板...</LoadingSpinner>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <WelcomeSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <WelcomeTitle>欢迎回来，{user.username}！</WelcomeTitle>
        <WelcomeSubtitle>
          今天是个美好的日子，让我们继续这段温馨的陪伴时光吧 🌟
        </WelcomeSubtitle>
      </WelcomeSection>

      <StatsGrid>
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatIcon><FaBook /></StatIcon>
          <StatValue>{stats.diaries}</StatValue>
          <StatLabel>篇日记</StatLabel>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatIcon><FaCheckCircle /></StatIcon>
          <StatValue>{stats.checkins}</StatValue>
          <StatLabel>次打卡</StatLabel>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatIcon><FaGamepad /></StatIcon>
          <StatValue>{stats.games}</StatValue>
          <StatLabel>次游戏</StatLabel>
        </StatCard>
        
        <StatCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StatIcon><FaHeart /></StatIcon>
          <StatValue>{stats.streak}</StatValue>
          <StatLabel>天连续</StatLabel>
        </StatCard>
      </StatsGrid>

      <QuickActions>
        {quickActions.map((action, index) => (
          <ActionCard
            key={action.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
            onClick={() => window.location.href = action.path}
          >
            <ActionIcon>
              <action.icon />
            </ActionIcon>
            <ActionTitle>{action.title}</ActionTitle>
            <ActionDescription>{action.description}</ActionDescription>
          </ActionCard>
        ))}
      </QuickActions>

      <RecentActivity
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <ActivityTitle>最近活动</ActivityTitle>
        {recentActivity.map((activity, index) => (
          <ActivityItem key={index}>
            <ActivityIcon>
              <activity.icon />
            </ActivityIcon>
            <ActivityContent>
              <ActivityText>{activity.text}</ActivityText>
              <ActivityTime>{activity.time}</ActivityTime>
            </ActivityContent>
          </ActivityItem>
        ))}
      </RecentActivity>
    </DashboardContainer>
  );
}

export default Dashboard;