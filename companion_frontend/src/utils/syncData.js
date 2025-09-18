// 数据同步工具函数
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * 同步人设数据到后端
 * @param {string} qqId - QQ号
 * @param {string} persona - 人设文本
 */
export const syncPersona = async (qqId, persona) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sync/persona`, {
      qq_id: qqId,
      persona: persona
    });
    
    if (response.data.success) {
      console.log('✅ 人设同步成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 人设同步失败:', error);
    return false;
  }
};

/**
 * 同步记忆数据到后端
 * @param {string} qqId - QQ号
 * @param {Array} memories - 记忆数组
 */
export const syncMemories = async (qqId, memories) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sync/memory`, {
      qq_id: qqId,
      memories: memories
    });
    
    if (response.data.success) {
      console.log('✅ 记忆同步成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 记忆同步失败:', error);
    return false;
  }
};

/**
 * 从URL参数获取QQ号
 * @param {string} url - 当前URL
 * @returns {string|null} QQ号
 */
export const getQQIdFromURL = (url) => {
  try {
    const urlObj = new URL(url);
    const qqParam = urlObj.searchParams.get('qq');
    return qqParam;
  } catch (error) {
    console.error('解析URL失败:', error);
    return null;
  }
};

/**
 * 检查是否需要同步数据
 * @param {string} qqId - QQ号
 * @returns {boolean} 是否需要同步
 */
export const shouldSyncData = (qqId) => {
  if (!qqId) return false;
  
  // 检查本地存储中是否有同步标记
  const lastSync = localStorage.getItem(`last_sync_${qqId}`);
  if (!lastSync) return true;
  
  // 如果超过1小时没有同步，则需要重新同步
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return parseInt(lastSync) < oneHourAgo;
};

/**
 * 标记数据已同步
 * @param {string} qqId - QQ号
 */
export const markDataSynced = (qqId) => {
  localStorage.setItem(`last_sync_${qqId}`, Date.now().toString());
};