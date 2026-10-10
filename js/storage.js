/* localStorage 封装：自定义关卡 CRUD + 最佳步数。 */
(function (PPZ) {
  'use strict';

  var KEYS = PPZ.config.STORAGE_KEYS;

  var hasLocalStorage = (function () {
    try {
      return typeof window.localStorage !== 'undefined' && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  })();

  function safeGet(key) {
    if (!hasLocalStorage) return null;
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(key, value) {
    if (!hasLocalStorage) return false;
    try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  function loadCustomLevels() {
    var raw = safeGet(KEYS.CUSTOM_LEVELS);
    if (!raw) return [];
    try {
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function persistCustomLevels(list) {
    safeSet(KEYS.CUSTOM_LEVELS, JSON.stringify(list));
  }

  function uid() {
    return 'lv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 保存自定义关卡。entry 带 id 则更新，否则新建。
   * @param {{id?:string, name:string, author?:string, hint?:string, text:string, updatedAt?:number}} entry
   */
  function saveCustomLevel(entry) {
    var list = loadCustomLevels();
    var saved = {
      id: entry.id || uid(),
      name: entry.name || '未命名关卡',
      author: entry.author || '',
      hint: entry.hint || '',
      text: entry.text || '',
      updatedAt: entry.updatedAt || Date.now()
    };
    if (entry.id) {
      var replaced = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === entry.id) {
          list[i] = saved;
          replaced = true;
          break;
        }
      }
      if (!replaced) list.unshift(saved);
    } else {
      list.unshift(saved);
    }
    persistCustomLevels(list);
    return saved;
  }

  function deleteCustomLevel(id) {
    var list = loadCustomLevels();
    var next = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) next.push(list[i]);
    }
    persistCustomLevels(next);
    return next;
  }

  function bestSteps(levelId) {
    if (!levelId) return null;
    var raw = safeGet(KEYS.BEST_STEPS);
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      return (obj && typeof obj[levelId] === 'number') ? obj[levelId] : null;
    } catch (e) {
      return null;
    }
  }

  function saveBest(levelId, steps) {
    if (!levelId || typeof steps !== 'number') return;
    var obj = {};
    var raw = safeGet(KEYS.BEST_STEPS);
    if (raw) {
      try { obj = JSON.parse(raw) || {}; } catch (e) { obj = {}; }
    }
    var prev = obj[levelId];
    if (typeof prev === 'number' && prev <= steps) return;
    obj[levelId] = steps;
    safeSet(KEYS.BEST_STEPS, JSON.stringify(obj));
  }

  PPZ.storage = {
    loadCustomLevels: loadCustomLevels,
    saveCustomLevel: saveCustomLevel,
    deleteCustomLevel: deleteCustomLevel,
    bestSteps: bestSteps,
    saveBest: saveBest
  };
})(window.PPZ);
