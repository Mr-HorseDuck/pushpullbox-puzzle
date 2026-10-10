/* File System Access API 封装。
 * 只在 Chrome / Edge 可用；不支持的浏览器由 menu / editor 走降级路径
 * （webkitdirectory 只读加载 + Blob 下载保存）。
 * dirHandle 用 IndexedDB 持久化，下次启动可凭 queryPermission 静默恢复；
 * requestPermission 必须由用户点击触发，所以「恢复授权」按钮放在菜单上。
 */
(function (PPZ) {
  'use strict';

  var DB_NAME = 'ppz-fs';
  var STORE = 'handles';
  var KEY = 'levelsDir';

  function isSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /** 把文件夹句柄存进 IndexedDB，供下次启动恢复。 */
  async function saveDirHandle(dirHandle) {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(dirHandle, KEY);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  /** 从 IndexedDB 读取上次保存的文件夹句柄；没有或失败返回 null。 */
  async function loadDirHandle() {
    try {
      var db = await openDB();
      var result = await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
      return result;
    } catch (e) {
      // 某些 file:// 环境下 IndexedDB 不可用，降级为「没有保存过文件夹」
      return null;
    }
  }

  /** 弹出系统文件夹选择器。用户取消时抛出 AbortError，由调用方识别。 */
  async function pickFolder() {
    if (!isSupported()) return null;
    return window.showDirectoryPicker({ mode: 'readwrite' });
  }

  /** 先查询、再请求授权。requestPermission 需要用户手势，只能在点击回调里用。 */
  async function verifyPermission(dirHandle, readWrite) {
    var opts = { mode: readWrite ? 'readwrite' : 'read' };
    if (await dirHandle.queryPermission(opts) === 'granted') return true;
    if (await dirHandle.requestPermission(opts) === 'granted') return true;
    return false;
  }

  /** 只查询授权状态，不弹窗。适合页面加载时静默恢复。 */
  async function queryPermission(dirHandle, readWrite) {
    var opts = { mode: readWrite ? 'readwrite' : 'read' };
    try {
      return (await dirHandle.queryPermission(opts)) === 'granted';
    } catch (e) {
      return false;
    }
  }

  /** 遍历文件夹里的 .txt 文件，按文件名排序。 */
  async function listTxtFiles(dirHandle) {
    var out = [];
    for await (var entry of dirHandle.values()) {
      if (entry.kind === 'file' && /\.txt$/i.test(entry.name)) {
        out.push({ name: entry.name, fileHandle: entry });
      }
    }
    out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return out;
  }

  /** 读取单个关卡文件的完整文本。 */
  async function readLevelFile(fileHandle) {
    var file = await fileHandle.getFile();
    return await file.text();
  }

  /** 覆盖写入单个关卡文件。 */
  async function writeLevelFile(fileHandle, text) {
    var writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  /** 在文件夹里新建（或覆盖）一个 .txt 关卡文件，返回其 fileHandle。 */
  async function createLevelFile(dirHandle, fileName, text) {
    var name = /\.txt$/i.test(fileName) ? fileName : fileName + '.txt';
    var fileHandle = await dirHandle.getFileHandle(name, { create: true });
    await writeLevelFile(fileHandle, text);
    return fileHandle;
  }

  PPZ.fsAccess = {
    isSupported: isSupported,
    pickFolder: pickFolder,
    listTxtFiles: listTxtFiles,
    readLevelFile: readLevelFile,
    writeLevelFile: writeLevelFile,
    createLevelFile: createLevelFile,
    saveDirHandle: saveDirHandle,
    loadDirHandle: loadDirHandle,
    verifyPermission: verifyPermission,
    queryPermission: queryPermission
  };
})(window.PPZ);
