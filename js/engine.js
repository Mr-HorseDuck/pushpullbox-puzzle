/* 游戏引擎：纯逻辑，不碰 DOM。
 * 状态 = { floor: string[], boxes: string[] }（行字符串，不可变更新）。
 */
(function (PPZ) {
  'use strict';

  var DIRS = PPZ.config.ARROW_DIRS;

  function inBounds(rows, cols, r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  /** 从关卡对象创建初始状态。 */
  function makeState(level) {
    return {
      floor: level.floor.slice(),
      boxes: level.boxes.slice()
    };
  }

  /** 深拷贝一份状态（用于 undo / redo 历史）。 */
  function cloneState(state) {
    return {
      floor: state.floor.slice(),
      boxes: state.boxes.slice()
    };
  }

  function setBox(boxes, r, c, ch) {
    boxes[r] = boxes[r].slice(0, c) + ch + boxes[r].slice(c + 1);
  }

  function canPlace(state, boxes, r, c) {
    var rows = state.floor.length;
    var cols = state.floor[0].length;
    if (!inBounds(rows, cols, r, c)) return false;
    if (state.floor[r][c] === '#') return false; // 虚空
    return boxes[r][c] === '.';
  }

  /** 沿 (dr, dc) 直线扫描，遇到虚空/越界即停，返回第一个箱子位置；没有返回 null。 */
  function scanFirstBox(state, boxes, r, c, dr, dc) {
    var rows = state.floor.length;
    var cols = state.floor[0].length;
    var rr = r + dr;
    var cc = c + dc;
    while (inBounds(rows, cols, rr, cc) && state.floor[rr][cc] !== '#') {
      if (boxes[rr][cc] !== '.') return { r: rr, c: cc };
      rr += dr;
      cc += dc;
    }
    return null;
  }

  /** 尝试把 from 处的箱子朝 (dr, dc) 移动一格。固定箱返回 false。 */
  function moveBox(state, boxes, from, dr, dc) {
    var ch = boxes[from.r][from.c];
    if (ch === 'F') return false;
    var tr = from.r + dr;
    var tc = from.c + dc;
    if (!canPlace(state, boxes, tr, tc)) return false;
    setBox(boxes, from.r, from.c, '.');
    setBox(boxes, tr, tc, ch);
    return true;
  }

  /**
   * 点击 (r, c) 处的方向箱。
   * 返回 { state, changed }；changed=false 时 state 为原引用。
   */
  function tryMove(state, r, c) {
    var rows = state.floor.length;
    var cols = state.floor[0].length;
    if (!inBounds(rows, cols, r, c)) return { state: state, changed: false };

    var arrow = state.boxes[r][c];
    var dir = DIRS[arrow];
    if (!dir) return { state: state, changed: false };

    var boxes = state.boxes.slice();
    var pushed = false;
    var pulled = false;

    // 推：沿箭头方向 d 找第一个箱子 F，把 F 移到 F+d
    var f = scanFirstBox(state, boxes, r, c, dir.dr, dir.dc);
    if (f) pushed = moveBox(state, boxes, f, dir.dr, dir.dc);

    // 拉：沿反方向 -d 找第一个箱子 B，把 B 移到 B+d（朝方向箱靠拢）
    var b = scanFirstBox(state, boxes, r, c, -dir.dr, -dir.dc);
    if (b) pulled = moveBox(state, boxes, b, dir.dr, dir.dc);

    if (!pushed && !pulled) return { state: state, changed: false };
    return { state: { floor: state.floor, boxes: boxes }, changed: true };
  }

  /** 所有钥匙箱都位于钥匙孔上即胜利。 */
  function isWin(state) {
    var rows = state.floor.length;
    if (rows === 0) return false;
    var cols = state.floor[0].length;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (state.boxes[r][c] === 'K' && state.floor[r][c] !== 'O') return false;
      }
    }
    return true;
  }

  PPZ.engine = {
    makeState: makeState,
    cloneState: cloneState,
    tryMove: tryMove,
    isWin: isWin
  };
})(window.PPZ);
