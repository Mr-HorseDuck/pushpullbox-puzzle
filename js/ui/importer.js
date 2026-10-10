/* 导入界面：粘贴文本或读取 .txt 文件，解析成功后直接开玩。 */
(function (PPZ) {
  'use strict';

  var el = document.getElementById('screen-importer');
  var ta = document.getElementById('importer-textarea');
  var fileInput = document.getElementById('importer-file');
  var errorEl = document.getElementById('importer-error');

  function showError(msg) {
    errorEl.textContent = msg || '';
    errorEl.classList.toggle('hidden', !msg);
  }

  function enter() {
    showError('');
  }

  document.getElementById('btn-importer-back').addEventListener('click', function () {
    showError('');
    PPZ.router.showScreen('menu');
  });

  document.getElementById('btn-importer-file').addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      ta.value = String(reader.result || '');
      showError('');
    };
    reader.onerror = function () {
      showError('读取文件失败');
    };
    reader.readAsText(file, 'utf-8');
    fileInput.value = '';
  });

  document.getElementById('btn-importer-load').addEventListener('click', function () {
    var text = ta.value;
    if (!text.trim()) {
      showError('请先粘贴或读取关卡文本');
      return;
    }
    try {
      var level = PPZ.level.parseLevel(text);
      showError('');
      ta.value = '';
      PPZ.router.showScreen('game', { level: level, levelId: null });
    } catch (err) {
      showError('解析失败：' + err.message);
    }
  });

  PPZ.router.register('importer', el, enter);
})(window.PPZ);
