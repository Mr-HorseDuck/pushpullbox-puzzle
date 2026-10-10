/* 关卡来源统一管理：内置 + 本地文件夹。
 * UI 通过 onChange 订阅刷新，避免菜单/编辑器各自维护一份列表导致不一致。
 * 本地条目结构：{ name, fileHandle, file, readonly, level, error }
 *  - FSA 模式：fileHandle 有效、file 为 null、readonly 为 false
 *  - 降级模式：fileHandle 为 null、file 为 File 对象、readonly 为 true
 */
(function (PPZ) {
  'use strict';

  var state = {
    builtin: [],
    local: [],
    dirHandle: null,
    pendingDirHandle: null,
    fallbackMode: false
  };
  var listeners = [];

  function onChange(cb) {
    if (typeof cb === 'function') listeners.push(cb);
  }

  function notify() {
    listeners.forEach(function (cb) {
      try { cb(); } catch (e) { /* 单个监听器出错不拖垮其它 */ }
    });
  }

  /** 解析内置关卡（builtin.js 里的内联文本）。 */
  function loadBuiltin() {
    var items = (PPZ.levels && PPZ.levels.builtin) ? PPZ.levels.builtin : [];
    var builtin = [];
    items.forEach(function (item) {
      try {
        var level = PPZ.level.parseLevel(item.text);
        builtin.push({
          id: item.id,
          name: level.name,
          author: level.author,
          hint: level.hint,
          level: level
        });
      } catch (e) {
        // 单个内置关卡解析失败不阻塞其它关卡
        builtin.push({ id: item.id, name: item.id, author: '', hint: '', level: null, error: e.message });
      }
    });
    state.builtin = builtin;
    notify();
    return state.builtin;
  }

  /** 扫描并读取整个文件夹里的 .txt 关卡，替换本地列表。 */
  async function loadLocalFromFolder(dirHandle) {
    state.dirHandle = dirHandle;
    state.fallbackMode = false;
    var files = await PPZ.fsAccess.listTxtFiles(dirHandle);
    var entries = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      try {
        var text = await PPZ.fsAccess.readLevelFile(f.fileHandle);
        var level = PPZ.level.parseLevel(text);
        entries.push({ name: f.name, fileHandle: f.fileHandle, file: null, readonly: false, level: level });
      } catch (e) {
        // 单个文件读取/解析失败仍留在列表里，方便用户看到是哪个文件坏了
        entries.push({ name: f.name, fileHandle: f.fileHandle, file: null, readonly: false, level: null, error: e.message });
      }
    }
    state.local = entries;
    notify();
    return entries;
  }

  /** 降级模式：webkitdirectory 选中的 File 列表，只读加载。 */
  async function setFallbackLocalFiles(fileList) {
    state.dirHandle = null;
    state.fallbackMode = true;
    var entries = [];
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      try {
        var text = await file.text();
        var level = PPZ.level.parseLevel(text);
        entries.push({ name: file.name, fileHandle: null, file: file, readonly: true, level: level });
      } catch (e) {
        entries.push({ name: file.name, fileHandle: null, file: file, readonly: true, level: null, error: e.message });
      }
    }
    state.local = entries;
    notify();
    return entries;
  }

  function getAll() {
    return { builtin: state.builtin.slice(), local: state.local.slice() };
  }

  function getLocalByName(name) {
    for (var i = 0; i < state.local.length; i++) {
      var e = state.local[i];
      if (e.name === name || e.name === name + '.txt') return e;
    }
    return null;
  }

  function getDirHandle() { return state.dirHandle; }
  function setDirHandle(h) { state.dirHandle = h; }
  function isFallbackMode() { return state.fallbackMode; }
  function getPendingDirHandle() { return state.pendingDirHandle; }
  function setPendingDirHandle(h) { state.pendingDirHandle = h; notify(); }
  function clearPendingDirHandle() { state.pendingDirHandle = null; notify(); }

  PPZ.levelStore = {
    onChange: onChange,
    loadBuiltin: loadBuiltin,
    loadLocalFromFolder: loadLocalFromFolder,
    setFallbackLocalFiles: setFallbackLocalFiles,
    getAll: getAll,
    getLocalByName: getLocalByName,
    getDirHandle: getDirHandle,
    setDirHandle: setDirHandle,
    isFallbackMode: isFallbackMode,
    getPendingDirHandle: getPendingDirHandle,
    setPendingDirHandle: setPendingDirHandle,
    clearPendingDirHandle: clearPendingDirHandle
  };
})(window.PPZ);
