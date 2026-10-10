/* 入口：加载内置关卡、显示主菜单，并尝试静默恢复上次授权的关卡文件夹。
 * 恢复规则：
 *  - 只在支持 File System Access API 的浏览器里做
 *  - 只调用 queryPermission（不弹窗）；需要重新授权时把句柄交给菜单，
 *    由用户点击「恢复上次的关卡文件夹」按钮触发 requestPermission
 */
(function (PPZ) {
  'use strict';

  function init() {
    PPZ.levelStore.loadBuiltin();
    PPZ.router.showScreen('menu');
    tryRestoreFolder();
  }

  async function tryRestoreFolder() {
    if (!PPZ.fsAccess.isSupported()) return; // 不支持 FSA 的浏览器无需恢复

    var dirHandle = null;
    try {
      dirHandle = await PPZ.fsAccess.loadDirHandle();
    } catch (e) {
      return; // IndexedDB 不可用/读取失败：静默跳过，不影响启动
    }
    if (!dirHandle) return;

    // 只能先 queryPermission；requestPermission 必须由用户手势触发
    var granted = await PPZ.fsAccess.queryPermission(dirHandle, true);
    if (granted) {
      try {
        await PPZ.levelStore.loadLocalFromFolder(dirHandle);
      } catch (e) {
        // 文件夹可能已被移动/删除：让用户通过「恢复」按钮重新授权
        PPZ.levelStore.setPendingDirHandle(dirHandle);
      }
    } else {
      // 权限被撤销或待确认：菜单上显示「恢复上次的关卡文件夹」按钮
      PPZ.levelStore.setPendingDirHandle(dirHandle);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.PPZ);
