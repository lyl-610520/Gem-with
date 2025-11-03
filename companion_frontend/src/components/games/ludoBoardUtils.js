// prettier-ignore
const PATH_COORDINATES = [
  { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }, { r: 7, c: 6 },
  { r: 6, c: 7 }, { r: 5, c: 7 }, { r: 4, c: 7 }, { r: 3, c: 7 }, { r: 2, c: 7 },
  { r: 2, c: 8 }, { r: 2, c: 9 },
  { r: 2, c: 10 }, { r: 3, c: 10 }, { r: 4, c: 10 }, { r: 5, c: 10 }, { r: 6, c: 10 },
  { r: 7, c: 11 }, { r: 7, c: 12 }, { r: 7, c: 13 }, { r: 7, c: 14 }, { r: 7, c: 15 },
  { r: 8, c: 15 }, { r: 9, c: 15 },
  { r: 10, c: 15 }, { r: 10, c: 14 }, { r: 10, c: 13 }, { r: 10, c: 12 }, { r: 10, c: 11 },
  { r: 11, c: 10 }, { r: 12, c: 10 }, { r: 13, c: 10 }, { r: 14, c: 10 }, { r: 15, c: 10 },
  { r: 15, c: 9 }, { r: 15, c: 8 },
  { r: 15, c: 7 }, { r: 14, c: 7 }, { r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 },
  { r: 10, c: 6 }, { r: 10, c: 5 }, { r: 10, c: 4 }, { r: 10, c: 3 }, { r: 10, c: 2 },
  { r: 9, c: 2 }, { r: 8, c: 2 },
];

const BASE_COORDINATES = {
  red: [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 3 }],
  green: [{ r: 2, c: 12 }, { r: 3, c: 12 }, { r: 2, c: 13 }, { r: 3, c: 13 }],
  yellow: [{ r: 12, c: 12 }, { r: 13, c: 12 }, { r: 12, c: 13 }, { r: 13, c: 13 }],
  blue: [{ r: 12, c: 2 }, { r: 13, c: 2 }, { r: 12, c: 3 }, { r: 13, c: 3 }],
};

const HOME_PATH_COORDINATES = {
  red: [{ r: 8, c: 3 }, { r: 8, c: 4 }, { r: 8, c: 5 }, { r: 8, c: 6 }, { r: 8, c: 7 }, { r: 8, c: 8 }],
  green: [{ r: 3, c: 9 }, { r: 4, c: 9 }, { r: 5, c: 9 }, { r: 6, c: 9 }, { r: 7, c: 9 }, { r: 8, c: 9 }],
  yellow: [{ r: 9, c: 14 }, { r: 9, c: 13 }, { r: 9, c: 12 }, { r: 9, c: 11 }, { r: 9, c: 10 }, { r: 9, c: 9 }],
  blue: [{ r: 14, c: 8 }, { r: 13, c: 8 }, { r: 12, c: 8 }, { r: 11, c: 8 }, { r: 10, c: 8 }, { r: 9, c: 8 }],
};

const START_POSITIONS = { red: 0, green: 13, yellow: 26, blue: 39 };

// 返回棋子在棋盘上的grid坐标
export const getPieceGridPosition = (piece, playerColor) => {
  const { pos, id } = piece;
  const pieceIndex = parseInt(id.split('_')[1]) - 1;

  if (pos === 'base') {
    return BASE_COORDINATES[playerColor][pieceIndex];
  }

  if (typeof pos === 'number') {
    return PATH_COORDINATES[pos];
  }

  if (typeof pos === 'string' && pos.startsWith('home_')) {
    const homeStep = parseInt(pos.split('_')[1]) - 1;
    return HOME_PATH_COORDINATES[playerColor][homeStep];
  }

  return { r: 0, c: 0 }; // Should not happen
};

// 获取棋盘格子的颜色
export const getCellColor = (r, c) => {
    // Red Base
    if (r >= 1 && r <= 7 && c >= 1 && c <= 7) return '#ffcdd2';
    // Green Base
    if (r >= 1 && r <= 7 && c >= 10 && c <= 16) return '#c8e6c9';
    // Yellow Base
    if (r >= 10 && r <= 16 && c >= 10 && c <= 16) return '#fff9c4';
    // Blue Base
    if (r >= 10 && r <= 16 && c >= 1 && c <= 7) return '#bbdefb';
    // Center Home
    if (r >= 8 && r <= 9 && c >= 8 && c <= 9) return '#d1c4e9';
    
    for (const color in HOME_PATH_COORDINATES) {
        if(HOME_PATH_COORDINATES[color].some(coord => coord.r === r && coord.c === c)) {
            return {red: '#ef9a9a', green: '#a5d6a7', yellow: '#fff59d', blue: '#90caf9'}[color];
        }
    }

    if (PATH_COORDINATES.some(coord => coord.r === r && coord.c === c)) {
        for(const color in START_POSITIONS) {
            const startCoord = PATH_COORDINATES[START_POSITIONS[color]];
            if (startCoord.r === r && startCoord.c === c) {
                return {red: '#ef9a9a', green: '#a5d6a7', yellow: '#fff59d', blue: '#90caf9'}[color];
            }
        }
        return 'white';
    }

    return 'transparent';
};
