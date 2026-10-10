/* 关卡编辑器：调色板绘制、尺寸调整、导入导出、试玩，
 * 以及本地文件读写：
 *  - 「打开本地关卡…」从已授权文件夹里选一个关卡载入
 *  - 「保存」（Ctrl+S）：本地文件直接覆盖写回；否则存 localStorage
 *  - 「另存为本地文件…」在已授权文件夹里新建 .txt
 * 不支持 File System Access API 时：保存/另存为降级为 Blob 下载。
 */
(function (PPZ) {
  'use strict';

  var el = document.getElementById('screen-editor');
  var gridEl = document.getElementById('editor-grid');
  var paletteEl = document.getElementById('editor-palette');
  var colsInput = document.getElementById('editor-cols');
  var rowsInput = document.getElementById('editor-rows');
  var nameInput = document.getElementById('editor-name');
  var authorInput = document.getElementById('editor-author');
  var hintInput = document.getElementById('editor-hint');
  var statusEl = document.getElementById('editor-status');
  var fileInput = document.getElementById('editor-file');

  var btnOpenLocal = document.getElementById('btn-editor-open-local');
  var btnSave = document.getElementById('btn-editor-save');
  var btnSaveAs = document.getElementById('btn-editor-save-as');
  var editorLocalModal = document.getElementById('editor-local-modal');
  var editorLocalList = document.getElementById('editor-local-list');

  var EDITOR_CELL = 30;

  var PALETTE = [
    { layer: 'floor', value: '.', label: '地砖', cls: 'swatch-floor-tile' },
    { layer: 'floor', value: 'O', label: '钥匙孔', cls: 'swatch-floor-hole' },
    { layer: 'floor', value: '#', label: '虚空', cls: 'swatch-floor-void' },
    { layer: 'box', value: 'B', label: '白板箱', cls: 'swatch-box-plain' },
    { layer: 'box', value: 'K', label: '钥匙箱', cls: 'swatch-box-key' },
    { layer: 'box', value: 'F', label: '固定箱', cls: 'swatch-box-fixed' },
    { layer: 'box', value: '^', label: '上', cls: 'swatch-box-arrow' },
    { layer: 'box', value: '>', label: '右', cls: 'swatch-box-arrow' },
    { layer: 'box', value: 'v', label: '下', cls: 'swatch-box-arrow' },
    { layer: 'box', value: '<', label: '左', cls: 'swatch-box-arrow' }
  ];

  var palette = PALETTE[0];
  var cols = PPZ.config.DEFAULT_COLS;
  var rows = PPZ.config.DEFAULT_ROWS;
  var floor = [];
  var boxes = [];

  /* 当前编辑来源：new / local（可写 fileHandle）/ local-readonly（降级 File） */
  var editSource = { type: 'new' };

  function makeEmptyGrid(r, c) {
    var f = [];
    var b = [];
    for (var i = 0; i < r; i++) {
      var fr = [];
      var br = [];
      for (var j = 0; j < c; j++) {
        fr.push('.');
        br.push('.');
      }
      f.push(fr);
      b.push(br);
    }
    return { floor: f, boxes: b };
  }

  function resizeGrid(newRows, newCols) {
    var g = makeEmptyGrid(newRows, newCols);
    var copyRows = Math.min(newRows, floor.length);
    var copyCols = Math.min(newCols, floor.length > 0 ? floor[0].length : 0);
    for (var r = 0; r < copyRows; r++) {
      for (var c = 0; c < copyCols; c++) {
        g.floor[r][c] = floor[r][c];
        g.boxes[r][c] = boxes[r][c];
      }
    }
    floor = g.floor;
    boxes = g.boxes;
    rows = newRows;
    cols = newCols;
    render();
  }

  function toRows(g) {
    return g.map(function (row) { return row.join(''); });
  }

  function render() {
    if (!gridEl) return;
    var state = { floor: toRows(floor), boxes: toRows(boxes) };
    PPZ.renderer.render(gridEl, state, {
      cellSize: EDITOR_CELL,
      gridClass: 'editor-grid',
      onCellClick: paint,
      onCellContextMenu: erase
    });
  }

  /** 左键画：地砖类改 floor 层；箱子类改 boxes 层（虚空上放箱子先铺地砖）。 */
  function paint(r, c) {
    if (palette.layer === 'floor') {
      floor[r][c] = palette.value;
      if (palette.value === '#') boxes[r][c] = '.'; // 虚空不能放箱子
    } else {
      if (floor[r][c] === '#') floor[r][c] = '.';
      boxes[r][c] = palette.value;
    }
    render();
  }

  /** 右键擦：只擦箱子，保留地砖。 */
  function erase(r, c) {
    boxes[r][c] = '.';
    render();
  }

  function buildLevel() {
    return {
      name: nameInput.value.trim() || '未命名关卡',
      author: authorInput.value.trim(),
      hint: hintInput.value.trim(),
      floor: toRows(floor),
      boxes: toRows(boxes)
    };
  }

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
  }

  function displayName(name) {
    return String(name || '').replace(/\.txt$/i, '');
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** 把已解析的关卡对象铺到编辑网格里。 */
  function applyLevel(level) {
    var g = makeEmptyGrid(level.floor.length, level.floor[0].length);
    for (var r = 0; r < level.floor.length; r++) {
      for (var c = 0; c < level.floor[0].length; c++) {
        g.floor[r][c] = level.floor[r][c];
        g.boxes[r][c] = level.boxes[r][c];
      }
    }
    floor = g.floor;
    boxes = g.boxes;
    rows = level.floor.length;
    cols = level.floor[0].length;
    if (colsInput) colsInput.value = String(cols);
    if (rowsInput) rowsInput.value = String(rows);
    if (nameInput) nameInput.value = level.name || '';
    if (authorInput) authorInput.value = level.author || '';
    if (hintInput) hintInput.value = level.hint || '';
    render();
  }

  function loadFromText(text) {
    var level = PPZ.level.parseLevel(text);
    applyLevel(level);
    setStatus('已载入关卡', false);
  }

  function renderPalette() {
    if (!paletteEl) return;
    paletteEl.innerHTML = '';
    PALETTE.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch ' + item.cls;
      btn.textContent = item.label;
      if (palette === item) btn.classList.add('active');
      btn.addEventListener('click', function () {
        palette = item;
        renderPalette();
      });
      paletteEl.appendChild(btn);
    });
  }

  function clampInt(raw, min, max, fallback) {
    var n = parseInt(raw, 10);
    if (isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  /** 依据浏览器支持情况切换「保存」按钮文案。 */
  function updateSaveButtons() {
    if (!btnSave) return;
    if (PPZ.fsAccess.isSupported()) {
      btnSave.textContent = '保存（Ctrl+S）';
      if (btnSaveAs) btnSaveAs.textContent = '另存为本地文件…';
    } else {
      btnSave.textContent = '导出为 TXT 下载';
      if (btnSaveAs) btnSaveAs.textContent = '另存为下载…';
    }
  }

  /** 确保手里有一个已授权文件夹；没有就触发选择（需求 1 的流程）。 */
  async function ensureFolder() {
    var current = PPZ.levelStore.getDirHandle();
    if (current) return current;
    if (!PPZ.fsAccess.isSupported()) return null;
    try {
      var dirHandle = await PPZ.fsAccess.pickFolder();
      if (!dirHandle) return null;
      var ok = await PPZ.fsAccess.verifyPermission(dirHandle, true);
      if (!ok) {
        setStatus('未获得文件夹读写权限', true);
        return null;
      }
      await PPZ.fsAccess.saveDirHandle(dirHandle);
      PPZ.levelStore.clearPendingDirHandle();
      await PPZ.levelStore.loadLocalFromFolder(dirHandle);
      return dirHandle;
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      setStatus('打开文件夹失败：' + (e && e.message ? e.message : e), true);
      return null;
    }
  }

  /** 需求 2：保存。本地文件覆盖写回，否则回退 localStorage；降级时下载。 */
  async function save() {
    var level = buildLevel();
    var text = PPZ.level.stringifyLevel(level);

    // 降级：没有可写文件夹，改为下载
    if (!PPZ.fsAccess.isSupported()) {
      exportDownload();
      return;
    }

    // 正在编辑本地文件 → 覆盖写入原文件
    if (editSource.type === 'local' && editSource.fileHandle) {
      try {
        await PPZ.fsAccess.writeLevelFile(editSource.fileHandle, text);
        setStatus('已保存到 ' + editSource.name, false);
        return;
      } catch (e) {
        setStatus('写入失败：' + (e && e.message ? e.message : e), true);
        return;
      }
    }

    // 内置/新建/只读来源 → 回退到 localStorage
    var entry = PPZ.storage.saveCustomLevel({
      name: level.name,
      author: level.author,
      hint: level.hint,
      text: text,
      updatedAt: Date.now()
    });
    setStatus('已保存「' + entry.name + '」到我的关卡（localStorage）', false);
  }

  /** 需求 2：另存为本地文件（在已授权文件夹里新建 .txt）。 */
  async function saveAs() {
    var level = buildLevel();
    var text = PPZ.level.stringifyLevel(level);

    if (!PPZ.fsAccess.isSupported()) {
      var fallbackName = window.prompt('输入文件名（不带 .txt）', nameInput.value.trim() || 'level');
      if (!fallbackName) return;
      var fbFile = fallbackName.replace(/\.txt$/i, '') + '.txt';
      downloadText(fbFile, text);
      setStatus('已下载 ' + fbFile, false);
      return;
    }

    var dirHandle = await ensureFolder();
    if (!dirHandle) return;

    var fileName = window.prompt('输入文件名（不带 .txt）', nameInput.value.trim() || 'level');
    if (!fileName) return;

    try {
      var fileHandle = await PPZ.fsAccess.createLevelFile(dirHandle, fileName, text);
      editSource = { type: 'local', name: fileHandle.name, fileHandle: fileHandle };
      await PPZ.levelStore.loadLocalFromFolder(dirHandle); // 重新扫描，让菜单列表立刻最新
      setStatus('已保存到 ' + fileHandle.name, false);
    } catch (e) {
      setStatus('另存为失败：' + (e && e.message ? e.message : e), true);
    }
  }

  /** 导出为 TXT 下载（降级保存共用这个逻辑）。 */
  function exportDownload() {
    var text = PPZ.level.stringifyLevel(buildLevel());
    var filename = (nameInput.value.trim() || 'level').replace(/\.txt$/i, '') + '.txt';
    downloadText(filename, text);
    setStatus('已导出下载 ' + filename, false);
  }

  /** 需求 2：打开本地关卡。没有已授权文件夹时先触发选择。 */
  async function openLocal() {
    var items = PPZ.levelStore.getAll().local;
    if (!items.length) {
      if (PPZ.fsAccess.isSupported()) {
        var dirHandle = await ensureFolder();
        if (!dirHandle) return;
      } else {
        window.alert('请先回到主菜单，用「打开关卡文件夹」以只读方式加载本地关卡');
        return;
      }
    }
    renderLocalModal();
    if (editorLocalModal) editorLocalModal.classList.remove('hidden');
  }

  function renderLocalModal() {
    if (!editorLocalList) return;
    editorLocalList.innerHTML = '';
    var items = PPZ.levelStore.getAll().local;
    if (!items.length) {
      editorLocalList.innerHTML = '<div class="empty-hint">没有本地关卡</div>';
      return;
    }
    items.forEach(function (entry) {
      var item = document.createElement('div');
      item.className = 'editor-local-item';

      var info = document.createElement('div');
      info.className = 'level-info';

      var nameDiv = document.createElement('div');
      nameDiv.className = 'level-name';
      nameDiv.textContent = '📁 ' + displayName(entry.name) + (entry.readonly ? '（只读）' : '');
      info.appendChild(nameDiv);

      var metaParts = [];
      if (entry.level && entry.level.author) metaParts.push('作者：' + entry.level.author);
      if (entry.error) metaParts.push('解析失败：' + entry.error);
      if (metaParts.length) {
        var metaDiv = document.createElement('div');
        metaDiv.className = 'level-meta';
        metaDiv.textContent = metaParts.join(' · ');
        info.appendChild(metaDiv);
      }

      var openBtn = document.createElement('button');
      openBtn.textContent = entry.level ? '打开' : '无法打开';
      openBtn.disabled = !entry.level;
      openBtn.addEventListener('click', function () {
        if (!entry.level) return;
        applyLevel(entry.level);
        if (entry.fileHandle) {
          editSource = { type: 'local', name: entry.name, fileHandle: entry.fileHandle };
          setStatus('正在编辑本地关卡：' + entry.name, false);
        } else {
          editSource = { type: 'local-readonly', name: entry.name, file: entry.file };
          setStatus('正在编辑只读关卡：' + entry.name + '（保存将下载）', false);
        }
        if (editorLocalModal) editorLocalModal.classList.add('hidden');
      });

      item.appendChild(info);
      item.appendChild(openBtn);
      editorLocalList.appendChild(item);
    });
  }

  function closeLocalModal() {
    if (editorLocalModal) editorLocalModal.classList.add('hidden');
  }

  function enter(params) {
    setStatus('');
    params = params || {};
    if (params.editLocal && params.editLocal.level) {
      applyLevel(params.editLocal.level);
      if (params.editLocal.fileHandle) {
        editSource = { type: 'local', name: params.editLocal.name, fileHandle: params.editLocal.fileHandle };
        setStatus('正在编辑本地关卡：' + params.editLocal.name, false);
      } else {
        editSource = { type: 'local-readonly', name: params.editLocal.name, file: params.editLocal.file };
        setStatus('正在编辑只读关卡：' + params.editLocal.name + '（保存将下载）', false);
      }
    }
    updateSaveButtons();
    renderPalette();
    render();
  }

  function bindClick(id, handler) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
  }

  bindClick('btn-editor-back', function () {
    setStatus('');
    PPZ.router.showScreen('menu');
  });
  bindClick('btn-editor-save', save);
  bindClick('btn-editor-save-as', saveAs);
  bindClick('btn-editor-open-local', openLocal);
  bindClick('btn-editor-export', exportDownload);
  bindClick('btn-editor-import', function () {
    if (fileInput) fileInput.click();
  });
  bindClick('btn-editor-test', function () {
    try {
      var text = PPZ.level.stringifyLevel(buildLevel());
      var level = PPZ.level.parseLevel(text); // 顺带校验
      setStatus('');
      PPZ.router.showScreen('game', { level: level, levelId: null });
    } catch (err) {
      setStatus('无法试玩：' + err.message, true);
    }
  });
  bindClick('btn-editor-local-cancel', closeLocalModal);

  if (editorLocalModal) {
    editorLocalModal.addEventListener('click', function (ev) {
      if (ev.target === editorLocalModal) closeLocalModal();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          loadFromText(String(reader.result || ''));
        } catch (err) {
          setStatus('导入失败：' + err.message, true);
        }
      };
      reader.onerror = function () { setStatus('读取文件失败', true); };
      reader.readAsText(file, 'utf-8');
      fileInput.value = '';
    });
  }

  if (colsInput) {
    colsInput.addEventListener('change', function () {
      var n = clampInt(colsInput.value, 3, 40, cols);
      colsInput.value = String(n);
      resizeGrid(rows, n);
    });
  }

  if (rowsInput) {
    rowsInput.addEventListener('change', function () {
      var n = clampInt(rowsInput.value, 3, 40, rows);
      rowsInput.value = String(n);
      resizeGrid(n, cols);
    });
  }

  // Ctrl+S / Cmd+S 只在编辑器界面生效，避免干扰其它屏幕
  document.addEventListener('keydown', function (ev) {
    if (PPZ.router.currentScreen() !== 'editor') return;
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'S')) {
      ev.preventDefault();
      save();
    }
  });

  // 初始默认网格
  var init = makeEmptyGrid(PPZ.config.DEFAULT_ROWS, PPZ.config.DEFAULT_COLS);
  floor = init.floor;
  boxes = init.boxes;

  PPZ.router.register('editor', el, enter);
})(window.PPZ);
