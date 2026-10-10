/* 屏幕路由：注册各界面，showScreen 切换。 */
(function (PPZ) {
  'use strict';

  var screens = {};
  var current = null;

  PPZ.router = {
    /**
     * @param {string} name
     * @param {HTMLElement} el
     * @param {Function} [enter] 进入该屏幕时调用，参数为 showScreen 传入的 params
     */
    register: function (name, el, enter) {
      screens[name] = { el: el, enter: enter || null };
    },

    showScreen: function (name, params) {
      var target = screens[name];
      if (!target) return;
      Object.keys(screens).forEach(function (key) {
        screens[key].el.classList.toggle('hidden', key !== name);
      });
      current = name;
      if (target.enter) target.enter(params || {});
    },

    currentScreen: function () {
      return current;
    }
  };
})(window.PPZ);
