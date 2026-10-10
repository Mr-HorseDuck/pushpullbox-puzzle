/* 渲染器：把状态渲染成 CSS Grid 网格。 */
(function (PPZ) {
  'use strict';

  var BOX_LABELS = {
    'B': '▢',
    'K': '🔑',
    'F': '▣',
    '^': '↑',
    'v': '↓',
    '<': '←',
    '>': '→'
  };

  /** 依据可用空间计算正方形格子大小（含间距）。 */
  function computeCellSize(cols, rows, availW, availH) {
    var cfg = PPZ.config;
    var gap = cfg.GRID_GAP;
    var usableW = Math.max(0, availW - (cols - 1) * gap);
    var usableH = Math.max(0, availH - (rows - 1) * gap);
    var size = Math.floor(Math.min(usableW / cols, usableH / rows));
    if (size < cfg.MIN_CELL) size = cfg.MIN_CELL;
    if (size > cfg.MAX_CELL) size = cfg.MAX_CELL;
    return size;
  }

  function cellClass(floorCh, boxCh) {
    var cls = 'cell';
    if (floorCh === '#') cls += ' floor-void';
    else if (floorCh === 'O') cls += ' floor-hole';
    else cls += ' floor-tile';

    if (boxCh !== '.') {
      cls += ' box';
      if (boxCh === 'B') cls += ' box-plain';
      else if (boxCh === 'K') {
        cls += ' box-key';
        if (floorCh === 'O') cls += ' box-on-hole';
      } else if (boxCh === 'F') cls += ' box-fixed';
      else cls += ' box-arrow';
    }
    return cls;
  }

  /**
   * 渲染网格。
   * @param {HTMLElement} container
   * @param {{floor:string[], boxes:string[]}} state
   * @param {{cellSize?:number, availWidth?:number, availHeight?:number,
   *          gridClass?:string, onCellClick?:Function, onCellContextMenu?:Function}} opts
   */
  function render(container, state, opts) {
    opts = opts || {};
    var rows = state.floor.length;
    var cols = state.floor[0].length;
    var cellSize = opts.cellSize;
    if (!cellSize) {
      cellSize = computeCellSize(cols, rows, opts.availWidth || 400, opts.availHeight || 400);
    }

    container.innerHTML = '';
    container.className = 'grid' + (opts.gridClass ? ' ' + opts.gridClass : '');
    container.style.setProperty('--cols', String(cols));
    container.style.setProperty('--cell-size', cellSize + 'px');

    var frag = document.createDocumentFragment();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var f = state.floor[r][c];
        var b = state.boxes[r][c];
        var div = document.createElement('div');
        div.className = cellClass(f, b);
        if (b !== '.') div.textContent = BOX_LABELS[b] || b;
        div.setAttribute('data-r', String(r));
        div.setAttribute('data-c', String(c));
        (function (rr, cc) {
          if (opts.onCellClick) {
            div.addEventListener('click', function (ev) { opts.onCellClick(rr, cc, ev); });
          }
          if (opts.onCellContextMenu) {
            div.addEventListener('contextmenu', function (ev) {
              ev.preventDefault();
              opts.onCellContextMenu(rr, cc, ev);
            });
          }
        })(r, c);
        frag.appendChild(div);
      }
    }
    container.appendChild(frag);
    return cellSize;
  }

  PPZ.renderer = {
    render: render,
    computeCellSize: computeCellSize,
    BOX_LABELS: BOX_LABELS
  };
})(window.PPZ);
