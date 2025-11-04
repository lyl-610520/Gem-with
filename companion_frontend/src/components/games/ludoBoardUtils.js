// src/components/games/ludoBoardUtils.js
// prettier-ignore
export const PATH_COORDINATES = [
  // 红 → 绿 → 黄 → 蓝（逆时针）
  {r:7,c:2},{r:7,c:3},{r:7,c:4},{r:7,c:5},{r:7,c:6},
  {r:6,c:7},{r:5,c:7},{r:4,c:7},{r:3,c:7},{r:2,c:7},
  {r:2,c:8},{r:2,c:9},
  {r:2,c:10},{r:3,c:10},{r:4,c:10},{r:5,c:10},{r:6,c:10},
  {r:7,c:11},{r:7,c:12},{r:7,c:13},{r:7,c:14},{r:7,c:15},
  {r:8,c:15},{r:9,c:15},
  {r:10,c:15},{r:10,c:14},{r:10,c:13},{r:10,c:12},{r:10,c:11},
  {r:11,c:10},{r:12,c:10},{r:13,c:10},{r:14,c:10},{r:15,c:10},
  {r:15,c:9},{r:15,c:8},
  {r:15,c:7},{r:14,c:7},{r:13,c:7},{r:12,c:7},{r:11,c:7},
  {r:10,c:6},{r:10,c:5},{r:10,c:4},{r:10,c:3},{r:10,c:2},
  {r:9,c:2},{r:8,c:2},
];

export const BASE_COORDINATES = {
  red:    [{r:2,c:2},{r:3,c:2},{r:2,c:3},{r:3,c:3}],
  green:  [{r:2,c:12},{r:3,c:12},{r:2,c:13},{r:3,c:13}],
  yellow: [{r:12,c:12},{r:13,c:12},{r:12,c:13},{r:13,c:13}],
  blue:   [{r:12,c:2},{r:13,c:2},{r:12,c:3},{r:13,c:3}],
};

export const HOME_PATH_COORDINATES = {
  red:    [{r:8,c:3},{r:8,c:4},{r:8,c:5},{r:8,c:6},{r:8,c:7},{r:8,c:8}],
  green:  [{r:3,c:9},{r:4,c:9},{r:5,c:9},{r:6,c:9},{r:7,c:9},{r:8,c:9}],
  yellow: [{r:9,c:14},{r:9,c:13},{r:9,c:12},{r:9,c:11},{r:9,c:10},{r:9,c:9}],
  blue:   [{r:14,c:8},{r:13,c:8},{r:12,c:8},{r:11,c:8},{r:10,c:8},{r:9,c:8}],
};

export const START_POSITIONS = { red:0, green:13, yellow:26, blue:39 };

/** 棋子位置 → grid 坐标 */
export const getPieceGridPosition = (piece, playerColor) => {
  const { pos, id } = piece;
  const idx = parseInt(id.split('_')[1]) - 1;

  if (pos === 'base') return BASE_COORDINATES[playerColor][idx];
  if (typeof pos === 'number') return PATH_COORDINATES[pos];
  if (typeof pos === 'string' && pos.startsWith('home_')) {
    const step = parseInt(pos.split('_')[1]) - 1;
    return HOME_PATH_COORDINATES[playerColor][step];
  }
  return { r: 0, c: 0 };
};

/** 格子背景色（更饱满的 Material 色） */
export const getCellColor = (r, c) => {
  // 四大基地
  if (r >= 1 && r <= 6 && c >= 1 && c <= 6) return '#ef5350';   // red
  if (r >= 1 && r <= 6 && c >= 10 && c <= 15) return '#66bb6a'; // green
  if (r >= 10 && r <= 15 && c >= 10 && c <= 15) return '#ffca28'; // yellow
  if (r >= 10 && r <= 15 && c >= 1 && c <= 6) return '#42a5f5'; // blue

  // 中心 X
  if (r >= 7 && r <= 9 && c >= 7 && c <= 9) return '#ab47bc';

  // 回家路径（稍深）
  for (const col in HOME_PATH_COORDINATES) {
    if (HOME_PATH_COORDINATES[col].some(p => p.r === r && p.c === c))
      return {red:'#e53935',green:'#43a047',yellow:'#ffb300',blue:'#1e88e5'}[col];
  }

  // 主跑道（白色底）
  if (PATH_COORDINATES.some(p => p.r === r && p.c === c)) {
    // 起飞点高亮
    for (const col in START_POSITIONS) {
      const s = PATH_COORDINATES[START_POSITIONS[col]];
      if (s.r === r && s.c === c) return {red:'#e53935',green:'#43a047',yellow:'#ffb300',blue:'#1e88e5'}[col];
    }
    return '#ffffff';
  }

  return 'transparent';
};
