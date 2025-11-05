// src/components/games/ludoBoardUtils.js
// 这个文件现在是外包开发者设计的坐标系统和我们后端逻辑的“翻译官”

const CELL_SIZE = 40;
const PADDING = 20; // SVG画布内边距

// 52格主路径的SVG坐标
// prettier-ignore
const MAIN_PATH_POSITIONS = [
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, // 0-4
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, // 5-9
  { x: 7, y: 0 }, { x: 8, y: 0 }, // 10-11
  { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 }, // 12-16
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, // 17-21
  { x: 14, y: 7 }, { x: 14, y: 8 }, // 22-23
  { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 }, // 24-28
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, // 29-33
  { x: 7, y: 14 }, { x: 6, y: 14 }, // 34-35
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 }, // 36-40
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, // 41-45
  { x: 0, y: 7 } // 46, ... 后面还有5格在原版中, 但这个设计似乎是47格循环
];
// 为了补全52格循环，我们假设最后几格的位置
MAIN_PATH_POSITIONS.push({ x: 0, y: 6 }); // 47
MAIN_PATH_POSITIONS.push({ x: 0, y: 5 }); // 48 - (逻辑补充)
MAIN_PATH_POSITIONS.push({ x: 0, y: 4 }); // 49 - (逻辑补充)
MAIN_PATH_POSITIONS.push({ x: 0, y: 3 }); // 50 - (逻辑补充)
MAIN_PATH_POSITIONS.push({ x: 0, y: 2 }); // 51 - (逻辑补充)


// 基地(飞机场)的SVG坐标
const BASE_POSITIONS = {
  red: [{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }],
  green: [{ x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 }, { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 }],
  yellow: [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }],
  blue: [{ x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 }, { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 }]
};

// 安全回家路径的SVG坐标
const HOME_PATH_POSITIONS = {
  red: Array.from({ length: 6 }, (_, i) => ({ x: 1 + i, y: 7 })),
  green: Array.from({ length: 6 }, (_, i) => ({ x: 7, y: 1 + i })),
  yellow: Array.from({ length: 6 }, (_, i) => ({ x: 13 - i, y: 7 })),
  blue: Array.from({ length: 6 }, (_, i) => ({ x: 7, y: 13 - i }))
};

// 核心转换函数
export const getPiecePosition = (piece, playerColor) => {
  const { pos, id } = piece;
  const pieceIndex = parseInt(id.split('_')[1]) - 1;

  let gridPos;

  if (pos === 'base') {
    gridPos = BASE_POSITIONS[playerColor][pieceIndex];
  } else if (typeof pos === 'number') {
    gridPos = MAIN_PATH_POSITIONS[pos];
  } else if (typeof pos === 'string' && pos.startsWith('home_')) {
    const homeStep = parseInt(pos.split('_')[1]) - 1;
    gridPos = HOME_PATH_POSITIONS[playerColor][homeStep];
  } else {
    return { x: -100, y: -100 }; // 屏幕外
  }
  
  // 将格子坐标转换为最终的SVG像素坐标
  return {
      x: PADDING + gridPos.x * CELL_SIZE + CELL_SIZE / 2,
      y: PADDING + gridPos.y * CELL_SIZE + CELL_SIZE / 2
  };
};
