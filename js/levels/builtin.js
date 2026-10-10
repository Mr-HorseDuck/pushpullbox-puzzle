/* 本文件由脚本自动生成，请勿手动编辑。
 * 编辑 levels/*.txt 后运行 npm run build:levels 重新生成。
 */
(function (PPZ) {
  'use strict';

  PPZ.levels = PPZ.levels || {};

  PPZ.levels.builtin = [
    {
      id: 'builtin-01',
      // ---- 01-tutorial.txt ----
      text: `name: 教学关
author: 内置
hint: 点击方向箱，把钥匙箱推到钥匙孔上

[floor]
########
#......#
#......#
#......#
#......#
#....O.#
#......#
########

[boxes]
........
..v...>.
.>......
........
..K.....
........
..^.....
........
`
    },
    {
      id: 'builtin-02',
      // ---- 02-coincidence.txt ----
      text: `name: coincidence
author: AL_Ben
hint: 32steps enough

[floor]
.....
.....
....O
.....
.....

[boxes]
.....
.>vv.
K>.<.
.^^<.
.....
`
    }
  ];
})(window.PPZ);
