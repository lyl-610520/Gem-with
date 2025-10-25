// src/components/friends/AddFriendComponent.js

import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const AddFriendWrapper = styled.div`
  padding: 20px;
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: ${props => props.theme.borderRadius};
`;
const SearchForm = styled.form`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;
const SearchInput = styled.input`
  flex-grow: 1;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.border};
  font-size: 1rem;
`;
const SearchButton = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  font-weight: 600;
  cursor: pointer;
`;
const ResultList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;
const ResultItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.border};
  &:last-child {
    border-bottom: none;
  }
`;
const AddButton = styled.button`
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 15px;
  cursor: pointer;
  &:disabled {
    background: #a0aec0;
    cursor: not-allowed;
  }
`;

function AddFriendComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [sentRequests, setSentRequests] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const response = await axios.get(`/users/search?q=${query}`);
      setResults(response.data);
    } catch (error) {
      console.error("搜索用户失败:", error);
      alert('搜索失败，请稍后重试。');
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await axios.post('/friends/request', { user_id: userId });
      setSentRequests(prev => ({ ...prev, [userId]: true }));
    } catch (error) {
      console.error("发送好友请求失败:", error);
      alert(error.response?.data?.error || '发送请求失败。');
    }
  };

  return (
    <AddFriendWrapper>
      <SearchForm onSubmit={handleSearch}>
        <SearchInput
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入好友的昵称或QQ号"
        />
        <SearchButton type="submit">搜索</SearchButton>
      </SearchForm>
      <ResultList>
        {results.length === 0 && <p>没有搜索结果。</p>}
        {results.map(user => (
          <ResultItem key={user.id}>
            <span>{user.username} ({user.qq_id})</span>
            <AddButton
              onClick={() => handleSendRequest(user.id)}
              disabled={sentRequests[user.id]}
            >
              {sentRequests[user.id] ? '已发送' : '添加好友'}
            </AddButton>
          </ResultItem>
        ))}
      </ResultList>
    </AddFriendWrapper>
  );
}
export default AddFriendComponent;
