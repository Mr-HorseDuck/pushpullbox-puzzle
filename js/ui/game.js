/* 游戏界面：渲染棋盘、处理点击/撤回/重做/重开、键盘与胜利判定。 */
(function (PPZ) {
  'use strict';

  var el = document.getElementById('screen-game');
  var gridWrap = document.getElementById('game-grid-wrap');
  var gridEl = document.getElementById('game-grid');
  var titleEl = document.getElementById('game-title');
  var stepsEl = document.getElementById('game-steps');
  var winBanner = document.getElementById('game-win-banner');

  var level = null;
  var levelId = null;
  var state = null;
  var undoStack = [];
  var redoStack = [];
  var steps = 0;
  var resizeTimer = null;

  function enter(params) {
    var parsed = params.level || null;
    if (!parsed && params.levelText) {
      try {
        parsed = PPZ.level.parseLevel(params.levelText);
      } catch (err) {
        window.alert('关卡解析失败：' + err.message);
        return;
      }
    }
    if (!parsed) {
      PPZ.router.showScreen('menu');
      return;
    }
    level = parsed;
    levelId = params.levelId || null;
    reset();
  }

  function reset() {
    state = PPZ.engine.makeState(level);
    undoStack = [];
    redoStack = [];
    steps = 0;
    updateHud();
    hideWin();
    render();
  }

  function updateHud() {
    titleEl.textContent = level.name || '未命名关卡';
    stepsEl.textContent = String(steps);
  }

  function currentCellSize() {
    var availW = Math.max(80, gridWrap.clientWidth - 28);
    var availH = Math.max(80, gridWrap.clientHeight - 28);
    return PPZ.renderer.computeCellSize(level.floor[0].length, level.floor.length, availW, availH);
  }

  function render() {
    if (!level || !state) return;
    PPZ.renderer.render(gridEl, state, {
      cellSize: currentCellSize(),
      onCellClick: onCellClick
    });
  }

  function onCellClick(r, c) {
    var result = PPZ.engine.tryMove(state, r, c);
    if (!result.changed) return; // 无任何变化：不计步、不入历史
    undoStack.push(PPZ.engine.cloneState(state));
    state = result.state;
    redoStack = [];
    steps += 1;
    afterStateChange();
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(PPZ.engine.cloneState(state));
    state = undoStack.pop();
    steps -= 1;
    afterStateChange();
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(PPZ.engine.cloneState(state));
    state = redoStack.pop();
    steps += 1;
    afterStateChange();
  }

  function afterStateChange() {
    updateHud();
    render();
    if (PPZ.engine.isWin(state)) {
      winBanner.textContent = '🎉 通关！用了 ' + steps + ' 步';
      winBanner.classList.remove('hidden');
      if (levelId) PPZ.storage.saveBest(levelId, steps);
    } else {
      hideWin();
    }
  }

  function hideWin() {
    winBanner.classList.add('hidden');
    winBanner.textContent = '';
  }

  function onKeydown(ev) {
    if (PPZ.router.currentScreen() !== 'game') return;
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      undo();
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      redo();
    } else if (ev.key === ' ' || ev.code === 'Space') {
      ev.preventDefault();
      reset();
    }
  }

  function onResize() {
    if (PPZ.router.currentScreen() !== 'game') return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(render, 80);
  }

  document.getElementById('btn-game-back').addEventListener('click', function () {
    PPZ.router.showScreen('menu');
  });
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-restart').addEventListener('click', reset);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);

  PPZ.router.register('game', el, enter);
})(window.PPZ);
