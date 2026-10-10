/* 关卡文本解析与序列化：parseLevel / stringifyLevel，支持 round-trip。 */
(function (PPZ) {
  'use strict';

  var FLOOR_CHARS = { '.': true, 'O': true, '#': true };
  var BOX_CHARS = { '.': true, 'B': true, 'K': true, 'F': true, '^': true, 'v': true, '<': true, '>': true };
  var META_KEYS = { name: true, author: true, hint: true };

  function stripLineEnd(line) {
    return line.replace(/\r$/, '');
  }

  /**
   * 解析关卡文本。
   * @param {string} text
   * @returns {{name:string, author:string, hint:string, floor:string[], boxes:string[]}}
   */
  function parseLevel(text) {
    if (typeof text !== 'string') {
      throw new Error('关卡文本必须是字符串');
    }

    var lines = text.split('\n');
    var meta = { name: '', author: '', hint: '' };
    var floor = [];
    var boxes = [];
    var section = null;
    var seenFloor = false;
    var seenBoxes = false;

    for (var i = 0; i < lines.length; i++) {
      var line = stripLineEnd(lines[i]).replace(/\s+$/, '');
      if (line === '') continue;
      if (/^\s*\/\//.test(line)) continue; // 注释只用 //，不用 #（# 是虚空字符）

      var sectionMatch = line.match(/^\[([A-Za-z0-9_]+)\]\s*$/);
      if (sectionMatch) {
        var sec = sectionMatch[1].toLowerCase();
        if (sec === 'floor') {
          section = 'floor';
          seenFloor = true;
        } else if (sec === 'boxes') {
          section = 'boxes';
          seenBoxes = true;
        } else {
          throw new Error('未知区块：[' + sectionMatch[1] + ']（只支持 [floor] 和 [boxes]）');
        }
        continue;
      }

      if (section === null) {
        var metaMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
        if (metaMatch && META_KEYS[metaMatch[1].toLowerCase()]) {
          meta[metaMatch[1].toLowerCase()] = metaMatch[2];
          continue;
        }
        throw new Error('第 ' + (i + 1) + ' 行无法识别：区块外只允许 key: value 元数据或 // 注释');
      }

      if (section === 'floor') {
        floor.push(line);
      } else if (section === 'boxes') {
        boxes.push(line);
      }
    }

    if (!seenFloor) throw new Error('缺少 [floor] 区块');
    if (!seenBoxes) throw new Error('缺少 [boxes] 区块');
    if (floor.length === 0) throw new Error('[floor] 区块为空');
    if (boxes.length === 0) throw new Error('[boxes] 区块为空');
    if (floor.length !== boxes.length) {
      throw new Error('[floor] 与 [boxes] 行数不一致：' + floor.length + ' 行 vs ' + boxes.length + ' 行');
    }

    var rows = floor.length;
    var cols = floor[0].length;
    if (cols === 0) throw new Error('[floor] 第 1 行为空');

    for (var r = 0; r < rows; r++) {
      if (floor[r].length !== cols) {
        throw new Error('[floor] 第 ' + (r + 1) + ' 行长度不一致（应为 ' + cols + ' 列）');
      }
      if (boxes[r].length !== cols) {
        throw new Error('[boxes] 第 ' + (r + 1) + ' 行长度不一致（应为 ' + cols + ' 列）');
      }
      for (var c = 0; c < cols; c++) {
        var f = floor[r][c];
        var b = boxes[r][c];
        if (!FLOOR_CHARS[f]) {
          throw new Error('[floor] 第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列是非法字符：' + f);
        }
        if (!BOX_CHARS[b]) {
          throw new Error('[boxes] 第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列是非法字符：' + b);
        }
        if (b !== '.' && f === '#') {
          throw new Error('第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列：箱子的格子不能是虚空');
        }
      }
    }

    return {
      name: meta.name || '未命名关卡',
      author: meta.author || '',
      hint: meta.hint || '',
      floor: floor,
      boxes: boxes
    };
  }

  /**
   * 把关卡对象序列化为与 parseLevel 相同格式的文本。
   * @param {{name:string, author:string, hint:string, floor:string[], boxes:string[]}} level
   * @returns {string}
   */
  function stringifyLevel(level) {
    if (!level || !Array.isArray(level.floor) || !Array.isArray(level.boxes)) {
      throw new Error('无效的关卡对象');
    }
    var lines = [];
    lines.push('name: ' + (level.name || '未命名关卡'));
    if (level.author) lines.push('author: ' + level.author);
    if (level.hint) lines.push('hint: ' + level.hint);
    lines.push('');
    lines.push('[floor]');
    for (var r = 0; r < level.floor.length; r++) lines.push(level.floor[r]);
    lines.push('');
    lines.push('[boxes]');
    for (var b = 0; b < level.boxes.length; b++) lines.push(level.boxes[b]);
    lines.push('');
    return lines.join('\n');
  }

  PPZ.level = {
    parseLevel: parseLevel,
    stringifyLevel: stringifyLevel
  };
})(window.PPZ);
