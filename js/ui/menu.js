/* 主菜单：内置关卡 + 本地文件夹关卡 + 我的关卡（localStorage）列表。
 * 「打开关卡文件夹」走 File System Access API；不支持时降级为
 * <input type="file" webkitdirectory> 只读加载。
 * 上次授权的文件夹如果权限失效，会在按钮旁显示「恢复」按钮，由用户点击重新授权。
 */
(function (PPZ) {
  'use strict';

  var el = document.getElementById('screen-menu');
  var builtinListEl = document.getElementById('builtin-list');
  var localListEl = document.getElementById('local-list');
  var customListEl = document.getElementById('custom-list');
  var rulesModal = document.getElementById('rules-modal');
  var btnOpenFolder = document.getElementById('btn-open-folder');
  var btnRestoreFolder = document.getElementById('btn-restore-folder');
  var fsHintEl = document.getElementById('fs-hint');
  var folderInput = document.getElementById('folder-input');

  function formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /** 去掉 .txt 后缀，列表里显示更干净。 */
  function displayName(name) {
    return String(name || '').replace(/\.txt$/i, '');
  }

  function showFsHint(msg) {
    if (!fsHintEl) return;
    fsHintEl.textContent = msg || '';
    fsHintEl.classList.toggle('hidden', !msg);
  }

  /** 根据支持情况/待恢复句柄，更新文件夹按钮和提示。 */
  function updateFolderUi() {
    var supported = PPZ.fsAccess.isSupported();
    if (!supported) {
      // 降级提示常驻；此时「打开关卡文件夹」走 webkitdirectory 只读路径
      showFsHint('当前浏览器不支持直接保存到文件夹，将改用下载方式；打开文件夹为只读模式。');
    } else if (PPZ.router.currentScreen() === 'menu' && !PPZ.levelStore.getPendingDirHandle()) {
      showFsHint('');
    }
    if (btnRestoreFolder) {
      btnRestoreFolder.classList.toggle('hidden', !PPZ.levelStore.getPendingDirHandle());
    }
  }

  function makeRow(levelName, metaText, bestText, actions) {
    var row = document.createElement('div');
    row.className = 'level-row';

    var info = document.createElement('div');
    info.className = 'level-info';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'level-name';
    nameDiv.textContent = levelName + (bestText ? ' · ' + bestText : '');
    info.appendChild(nameDiv);

    if (metaText) {
      var metaDiv = document.createElement('div');
      metaDiv.className = 'level-meta';
      metaDiv.textContent = metaText;
      info.appendChild(metaDiv);
    }

    row.appendChild(info);

    if (actions && actions.length) {
      var wrap = document.createElement('div');
      wrap.className = 'level-row-actions';
      actions.forEach(function (a) {
        var btn = document.createElement('button');
        btn.textContent = a.label;
        if (a.cls) btn.className = a.cls;
        btn.addEventListener('click', a.onClick);
        wrap.appendChild(btn);
      });
      row.appendChild(wrap);
    }
    return row;
  }

  function renderBuiltin() {
    builtinListEl.innerHTML = '';
    var items = PPZ.levelStore.getAll().builtin;
    if (!items.length) {
      builtinListEl.innerHTML = '<div class="empty-hint">暂无内置关卡</div>';
      return;
    }
    items.forEach(function (item) {
      if (!item.level) {
        builtinListEl.appendChild(makeRow(item.name, '解析失败：' + item.error, '', []));
        return;
      }
      var best = PPZ.storage.bestSteps(item.id);
      var metaParts = [];
      if (item.author) metaParts.push('作者：' + item.author);
      builtinListEl.appendChild(makeRow(
        item.name,
        metaParts.join(' · '),
        best ? '最佳 ' + best + ' 步' : '',
        [{
          label: '开始', cls: 'btn-primary',
          onClick: function () {
            PPZ.router.showScreen('game', { level: item.level, levelId: item.id });
          }
        }]
      ));
    });
  }

  function renderLocal() {
    localListEl.innerHTML = '';
    var items = PPZ.levelStore.getAll().local;
    if (!items.length) {
      localListEl.innerHTML = '<div class="empty-hint">尚未打开关卡文件夹</div>';
      return;
    }
    items.forEach(function (entry) {
      var levelId = 'local:' + entry.name;
      var best = PPZ.storage.bestSteps(levelId);
      var metaParts = [];
      if (entry.level && entry.level.author) metaParts.push('作者：' + entry.level.author);
      if (entry.readonly) metaParts.push('只读');
      if (entry.error) metaParts.push('解析失败：' + entry.error);

      var actions = [];
      if (entry.level) {
        actions.push({
          label: '开始', cls: 'btn-primary',
          onClick: function () {
            PPZ.router.showScreen('game', { level: entry.level, levelId: levelId });
          }
        });
        actions.push({
          label: '编辑',
          onClick: function () {
            PPZ.router.showScreen('editor', { editLocal: entry });
          }
        });
      }
      localListEl.appendChild(makeRow(
        '📁 ' + displayName(entry.name),
        metaParts.join(' · '),
        best ? '最佳 ' + best + ' 步' : '',
        actions
      ));
    });
  }

  function renderCustom() {
    customListEl.innerHTML = '';
    var list = PPZ.storage.loadCustomLevels();
    if (list.length === 0) {
      customListEl.innerHTML = '<div class="empty-hint">暂无自定义关卡，去编辑器创建一个吧</div>';
      return;
    }
    list.forEach(function (entry) {
      var best = PPZ.storage.bestSteps(entry.id);
      var metaParts = [];
      if (entry.author) metaParts.push('作者：' + entry.author);
      if (entry.updatedAt) metaParts.push('更新于 ' + formatDate(entry.updatedAt));

      customListEl.appendChild(makeRow(
        entry.name || '未命名关卡',
        metaParts.join(' · '),
        best ? '最佳 ' + best + ' 步' : '',
        [
          {
            label: '开始', cls: 'btn-primary',
            onClick: function () {
              try {
                var level = PPZ.level.parseLevel(entry.text);
                level.id = entry.id;
                PPZ.router.showScreen('game', { level: level, levelId: entry.id });
              } catch (e) {
                window.alert('关卡解析失败：' + e.message);
              }
            }
          },
          {
            label: '删除', cls: 'btn-danger',
            onClick: function () {
              if (window.confirm('确定删除「' + (entry.name || '未命名关卡') + '」吗？')) {
                PPZ.storage.deleteCustomLevel(entry.id);
                renderCustom();
              }
            }
          }
        ]
      ));
    });
  }

  function startFirstBuiltin() {
    var items = PPZ.levelStore.getAll().builtin;
    if (!items.length) {
      window.alert('没有内置关卡');
      return;
    }
    var first = items[0];
    if (!first.level) {
      window.alert('内置关卡解析失败：' + (first.error || '未知错误'));
      return;
    }
    PPZ.router.showScreen('game', { level: first.level, levelId: first.id });
  }

  /** 需求 1：打开文件夹（FSA）或降级触发目录选择（只读）。 */
  async function openFolder() {
    if (!PPZ.fsAccess.isSupported()) {
      // 降级路径：webkitdirectory input 也是由这次点击间接触发，浏览器允许
      if (folderInput) folderInput.click();
      return;
    }
    try {
      var dirHandle = await PPZ.fsAccess.pickFolder();
      if (!dirHandle) return;
      var ok = await PPZ.fsAccess.verifyPermission(dirHandle, true);
      if (!ok) {
        showFsHint('未获得文件夹读写权限');
        return;
      }
      await PPZ.fsAccess.saveDirHandle(dirHandle);
      PPZ.levelStore.clearPendingDirHandle();
      await PPZ.levelStore.loadLocalFromFolder(dirHandle);
      showFsHint('');
    } catch (e) {
      if (e && e.name === 'AbortError') return; // 用户主动取消选择器，不是错误
      showFsHint('打开文件夹失败：' + (e && e.message ? e.message : e));
    }
  }

  /** 恢复上次的文件夹授权：requestPermission 必须在用户点击里调用。 */
  async function restoreFolder() {
    var dirHandle = PPZ.levelStore.getPendingDirHandle();
    if (!dirHandle) {
      updateFolderUi();
      return;
    }
    try {
      var ok = await PPZ.fsAccess.verifyPermission(dirHandle, true);
      if (!ok) {
        showFsHint('授权被拒绝，可重新点击「打开关卡文件夹」选择');
        return;
      }
      PPZ.levelStore.clearPendingDirHandle();
      await PPZ.levelStore.loadLocalFromFolder(dirHandle);
      showFsHint('');
    } catch (e) {
      showFsHint('恢复失败：' + (e && e.message ? e.message : e));
    }
  }

  /** 降级模式：webkitdirectory 选中的 File 列表，只读加载。 */
  async function onFolderInputChange() {
    if (!folderInput) return;
    var files = Array.prototype.slice.call(folderInput.files || []);
    var txts = files.filter(function (f) { return /\.txt$/i.test(f.name); });
    if (!txts.length) {
      showFsHint('所选文件夹里没有 .txt 文件');
      return;
    }
    try {
      await PPZ.levelStore.setFallbackLocalFiles(txts);
      var broken = PPZ.levelStore.getAll().local.filter(function (e) { return !e.level; });
      showFsHint(broken.length
        ? '已只读加载 ' + txts.length + ' 个关卡，其中 ' + broken.length + ' 个解析失败'
        : '已只读加载 ' + txts.length + ' 个关卡');
    } catch (e) {
      showFsHint('读取文件夹失败：' + (e && e.message ? e.message : e));
    }
  }

  function openRules() { rulesModal.classList.remove('hidden'); }
  function closeRules() { rulesModal.classList.add('hidden'); }

  function enter() {
    renderBuiltin();
    renderLocal();
    renderCustom();
    updateFolderUi();
  }

  if (document.getElementById('btn-start')) {
    document.getElementById('btn-start').addEventListener('click', startFirstBuiltin);
  }
  if (document.getElementById('btn-importer')) {
    document.getElementById('btn-importer').addEventListener('click', function () {
      PPZ.router.showScreen('importer');
    });
  }
  if (document.getElementById('btn-editor')) {
    document.getElementById('btn-editor').addEventListener('click', function () {
      PPZ.router.showScreen('editor');
    });
  }
  if (document.getElementById('btn-rules')) {
    document.getElementById('btn-rules').addEventListener('click', openRules);
  }
  if (document.getElementById('btn-rules-close')) {
    document.getElementById('btn-rules-close').addEventListener('click', closeRules);
  }
  if (btnOpenFolder) btnOpenFolder.addEventListener('click', openFolder);
  if (btnRestoreFolder) btnRestoreFolder.addEventListener('click', restoreFolder);
  if (folderInput) folderInput.addEventListener('change', onFolderInputChange);

  if (rulesModal) {
    rulesModal.addEventListener('click', function (ev) {
      if (ev.target === rulesModal) closeRules();
    });
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && rulesModal && !rulesModal.classList.contains('hidden')) closeRules();
  });

  // 关卡来源变化时自动刷新菜单（例如启动时静默恢复了文件夹）
  PPZ.levelStore.onChange(function () {
    updateFolderUi();
    if (PPZ.router.currentScreen() === 'menu') {
      renderBuiltin();
      renderLocal();
    }
  });

  PPZ.router.register('menu', el, enter);
})(window.PPZ);
