/* 常量配置：图例、方向、存储键、网格参数。 */
(function (PPZ) {
  'use strict';

  PPZ.config = {
    /** localStorage 键名 */
    STORAGE_KEYS: {
      CUSTOM_LEVELS: 'ppz.customLevels.v1',
      BEST_STEPS: 'ppz.bestSteps.v1'
    },

    /** [floor] 图例 */
    FLOOR_LEGEND: {
      '.': 'tile',   // 地砖
      'O': 'hole',   // 钥匙孔
      '#': 'void'    // 虚空
    },

    /** [boxes] 图例 */
    BOX_LEGEND: {
      '.': 'empty',
      'B': 'plain',  // 白板箱
      'K': 'key',    // 钥匙箱
      'F': 'fixed',  // 固定箱
      '^': 'arrow-up',
      'v': 'arrow-down',
      '<': 'arrow-left',
      '>': 'arrow-right'
    },

    /** 方向箱字符 -> 行/列增量 */
    ARROW_DIRS: {
      '^': { dr: -1, dc: 0 },
      '>': { dr: 0, dc: 1 },
      'v': { dr: 1, dc: 0 },
      '<': { dr: 0, dc: -1 }
    },

    DEFAULT_COLS: 8,
    DEFAULT_ROWS: 8,
    MAX_CELL: 96,
    MIN_CELL: 14,
    GRID_GAP: 2
  };
})(window.PPZ);
