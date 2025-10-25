import React, { useState } from 'react';
import styled from 'styled-components';
import { FaPlane } from 'react-icons/fa';
import {
  GameContent, GameHeader, GameTitleModal, CloseButton,
  GameButtonGroup, Button as BaseButton
} from '../Games';

// --- 游戏核心配置 ---
const COLORS = {
  red: '#e53e3e',
  green: '#48bb78',
  yellow: '#f6e05e',
  blue: '#4299e1',
};

const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];

// --- 样式化组件 ---
const LudoWrapper = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  grid-template-rows: repeat(15, 1fr);
  width: 500px;
  height: 500px;
  background: #f7fafc;
  border: 3px solid #718096;
  position: relative;
`;

const Cell = styled.div`
  grid-column: ${props => props.x + 1};
  grid-row: ${props => props.y + 1};
  background-color: ${props => props.color || '#edf2f7'};
  border: 1px solid #cbd5e0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HomeBase = styled(Cell)`
  grid-column: ${props => props.x + 1} / span 6;
  grid-row: ${props => props.y + 1} / span 6;
  background-color: ${props => props.color};
  border: 2px solid rgba(0,0,0,0.2);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  padding: 10px;
  gap: 5px;
`;

const StartSpot = styled.div`
  background-color: white;
  border-radius: 50%;
  border: 1px solid #a0aec0;
`;

const HomeTriangle = styled.div`
  grid-column: 7 / span 3;
  grid-row: 7 / span 3;
  background: conic-gradient(
    ${COLORS.red} 0deg 90deg,
    ${COLORS.green} 90deg 180deg,
    ${COLORS.yellow} 180deg 270deg,
    ${COLORS.blue} 270deg 360deg
  );
`;

const Piece = styled.div`
  position: absolute;
  top: ${props => `calc(${props.y} / 15 * 100% + 5px)`};
  left: ${props => `calc(${props.x} / 15 * 100% + 5px)`};
  width: calc(100% / 15 - 10px);
  height: calc(100% / 15 - 10px);
  background-color: ${props => props.color};
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.4);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease-in-out;
  cursor: pointer;
  z-index: 10;
`;

const GameControls = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

// --- 棋盘布局数据 ---
// 这是一个简化的布局，只定义路径和安全区
const boardLayout = [];
// ... 在这里我们可以填充所有 225 个格子的信息 ...
// 为了简化第一阶段，我们暂时只画出关键部分

function LudoGame({ onClose, onScore }) {
  // -1 表示在基地，0-51 是跑道，52-57 是回家路
  const [pieces, setPieces] = useState({
    red: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1],
  });

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(null);

  // VVVV 渲染棋盘的辅助函数 VVVV
  const renderBoard = () => {
    // 渲染基地
    const bases = [
      { x: 0, y: 0, color: COLORS.blue },
      { x: 9, y: 0, color: COLORS.red },
      { x: 0, y: 9, color: COLORS.yellow },
      { x: 9, y: 9, color: COLORS.green },
    ];

    // 渲染跑道
    const path = [];
    const pathCoords = [
      // 外圈
      ...Array.from({length: 6}, (_, i) => ({x: i, y: 6})),
      ...Array.from({length: 6}, (_, i) => ({x: 6, y: 5 - i})),
      ...Array.from({length: 3}, (_, i) => ({x: 7 + i, y: 0})),
      // ... 这是一个巨大的坐标数组，为了简洁我们先只画关键部分
    ];

    return (
      <>
        {bases.map(b => (
          <HomeBase key={b.color} x={b.x} y={b.y} color={b.color}>
            <StartSpot/><StartSpot/><StartSpot/><StartSpot/>
          </HomeBase>
        ))}
        <HomeTriangle />
        {/* 安全区 */}
        <Cell x={1} y={7} color={COLORS.yellow} />
        <Cell x={7} y={1} color={COLORS.red} />
        <Cell x={13} y={7} color={COLORS.green} />
        <Cell x={7} y={13} color={COLORS.blue} />
        {/* 回家路 */}
        {Array.from({length: 5}, (_, i) => <Cell key={`r-${i}`} x={7} y={1+i} color={COLORS.red} />)}
        {Array.from({length: 5}, (_, i) => <Cell key={`g-${i}`} x={9+i} y={7} color={COLORS.green} />)}
        {Array.from({length: 5}, (_, i) => <Cell key={`y-${i}`} x={1+i} y={7} color={COLORS.yellow} />)}
        {Array.from({length: 5}, (_, i) => <Cell key={`b-${i}`} x={7} y={9+i} color={COLORS.blue} />)}
      </>
    );
  };
  
  // VVVV 渲染棋子的辅助函数 VVVV
  const renderPieces = () => {
    // 这个函数未来会根据 pieces state 把棋子画在正确的位置
    // 现在先画在基地里
    const pieceElements = [];
    const basePositions = {
        blue: [{x: 1, y: 1}, {x: 4, y: 1}, {x: 1, y: 4}, {x: 4, y: 4}],
        red: [{x: 10, y: 1}, {x: 13, y: 1}, {x: 10, y: 4}, {x: 13, y: 4}],
        yellow: [{x: 1, y: 10}, {x: 4, y: 10}, {x: 1, y: 13}, {x: 4, y: 13}],
        green: [{x: 10, y: 10}, {x: 13, y: 10}, {x: 10, y: 13}, {x: 13, y: 13}],
    };
    
    PLAYER_COLORS.forEach(color => {
      pieces[color].forEach((pos, index) => {
        if (pos === -1) { // 在基地里
          pieceElements.push(
            <Piece key={`${color}-${index}`} color={COLORS[color]} {...basePositions[color][index]}>
              <FaPlane />
            </Piece>
          );
        }
      });
    });

    return pieceElements;
  };


  return (
    <GameContent style={{maxWidth: '800px'}}>
      <GameHeader>
        <GameTitleModal>飞行棋</GameTitleModal>
        <CloseButton onClick={onClose}>×</CloseButton>
      </GameHeader>
      
      <LudoWrapper>
        <Board>
          {renderBoard()}
          {renderPieces()}
        </Board>
        <GameControls>
          <h3>当前玩家: <span style={{color: COLORS[PLAYER_COLORS[currentPlayerIndex]]}}>{PLAYER_COLORS[currentPlayerIndex].toUpperCase()}</span></h3>
          <div>
            <h4>骰子</h4>
            <div style={{fontSize: '3rem', fontWeight: 'bold'}}>{diceValue || '?'}</div>
          </div>
          <BaseButton primary>投骰子</BaseButton>
          <p>游戏规则说明...</p>
        </GameControls>
      </LudoWrapper>

      <GameButtonGroup style={{marginTop: '20px'}}>
        <BaseButton>重新开始</BaseButton>
        <BaseButton primary onClick={onClose}>退出游戏</BaseButton>
      </GameButtonGroup>
    </GameContent>
  );
}

export default LudoGame;
