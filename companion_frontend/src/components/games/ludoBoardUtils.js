// src/components/games/ludoBoardUtils.js
// 这个文件现在负责将后端的逻辑位置，转换为SVG画布上的 x, y 坐标

const TILE_SIZE = 40; // 每个格子的尺寸
const PADDING = 20;   // 棋盘内边距

const getCoords = (col, row) => ({
  x: PADDING + col * TILE_SIZE,
  y: PADDING + row * TILE_SIZE,
});

// prettier-ignore
const PATH_COORDINATES = [
    getCoords(0, 6), getCoords(1, 6), getCoords(2, 6), getCoords(3, 6), getCoords(4, 6),
    getCoords(6, 4), getCoords(6, 3), getCoords(6, 2), getCoords(6, 1), getCoords(6, 0),
    getCoords(7, 0), getCoords(8, 0),
    getCoords(8, 1), getCoords(8, 2), getCoords(8, 3), getCoords(8, 4), getCoords(8, 6),
    getCoords(10, 6), getCoords(11, 6), getCoords(12, 6), getCoords(13, 6), getCoords(14, 6),
    getCoords(14, 7), getCoords(14, 8),
    getCoords(13, 8), getCoords(12, 8), getCoords(11, 8), getCoords(10, 8), getCoords(8, 10),
    getCoords(8, 11), getCoords(8, 12), getCoords(8, 13), getCoords(8, 14),
    getCoords(7, 14), getCoords(6, 14),
    getCoords(6, 13), getCoords(6, 12), getCoords(6, 11), getCoords(6, 10), getCoords(6, 8),
    getCoords(4, 8), getCoords(3, 8), getCoords(2, 8), getCoords(1, 8), getCoords(0, 8),
    getCoords(0, 7)
];

const BASE_COORDINATES = {
  red:    [getCoords(1, 1), getCoords(2, 1), getCoords(1, 2), getCoords(2, 2)],
  green:  [getCoords(12, 1), getCoords(13, 1), getCoords(12, 2), getCoords(13, 2)],
  yellow: [getCoords(12, 12), getCoords(13, 12), getCoords(12, 13), getCoords(13, 13)],
  blue:   [getCoords(1, 12), getCoords(2, 12), getCoords(1, 13), getCoords(2, 13)],
};

const HOME_PATH_COORDINATES = {
  red:    [getCoords(1, 7), getCoords(2, 7), getCoords(3, 7), getCoords(4, 7), getCoords(5, 7), getCoords(6, 7)],
  green:  [getCoords(7, 1), getCoords(7, 2), getCoords(7, 3), getCoords(7, 4), getCoords(7, 5), getCoords(7, 6)],
  yellow: [getCoords(13, 7), getCoords(12, 7), getCoords(11, 7), getCoords(10, 7), getCoords(9, 7), getCoords(8, 7)],
  blue:   [getCoords(7, 13), getCoords(7, 12), getCoords(7, 11), getCoords(7, 10), getCoords(7, 9), getCoords(7, 8)],
};

// 棋子逻辑位置到SVG坐标的转换函数
export const getPiecePosition = (piece, playerColor) => {
  const { pos, id } = piece;
  const pieceIndex = parseInt(id.split('_')[1]) - 1;

  if (pos === 'base') return BASE_COORDINATES[playerColor][pieceIndex];
  if (typeof pos === 'number') return PATH_COORDINATES[pos];
  if (typeof pos === 'string' && pos.startsWith('home_')) {
    const homeStep = parseInt(pos.split('_')[1]) - 1;
    return HOME_PATH_COORDINATES[playerColor][homeStep];
  }
  return { x: -100, y: -100 }; // 默认位置，屏幕外
};
