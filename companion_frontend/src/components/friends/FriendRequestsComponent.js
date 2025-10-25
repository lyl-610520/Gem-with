// src/components/friends/FriendRequestsComponent.js

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const RequestsWrapper = styled.div`
  padding: 20px;
  background: ${props => props.theme.cardBg};
  border: 1px solid ${props => props.theme.border};
  border-radius: ${props => props.theme.borderRadius};
`;
const RequestList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;
const RequestItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.border};
   &:last-child {
    border-bottom: none;
  }
`;
const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;
const ActionButton = styled.button`
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 15px;
  cursor: pointer;
  background: ${props => props.accept ? '#48bb78' : '#e53e3e'};
`;

function FriendRequestsComponent({ socket }) {
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/friends/requests');
      setRequests(response.data);
    } catch (error) {
      console.error("获取好友请求失败:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
    const handleNewRequest = (newRequestData) => {
      alert(`收到了来自 ${newRequestData.from_user.username} 的好友请求！`);
      fetchRequests();
    };
    socket.on('new_friend_request', handleNewRequest);
    return () => {
      socket.off('new_friend_request', handleNewRequest);
    };
  }, [socket]);

  const handleAccept = async (requestId) => {
    try {
      await axios.post('/friends/accept', { request_id: requestId });
      setRequests(prev => prev.filter(req => req.request_id !== requestId));
    } catch (error) { alert('接受请求失败。'); }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.post('/friends/reject', { request_id: requestId });
      setRequests(prev => prev.filter(req => req.request_id !== requestId));
    } catch (error) { alert('拒绝请求失败。'); }
  };

  return (
    <RequestsWrapper>
      {requests.length === 0 ? (
        <p>没有待处理的好友请求。</p>
      ) : (
        <RequestList>
          {requests.map(req => (
            <RequestItem key={req.request_id}>
              <span>来自 **{req.from_user.username}** 的好友请求</span>
              <ButtonGroup>
                <ActionButton accept onClick={() => handleAccept(req.request_id)}>接受</ActionButton>
                <ActionButton onClick={() => handleReject(req.request_id)}>拒绝</ActionButton>
              </ButtonGroup>
            </RequestItem>
          ))}
        </RequestList>
      )}
    </RequestsWrapper>
  );
}
export default FriendRequestsComponent;
