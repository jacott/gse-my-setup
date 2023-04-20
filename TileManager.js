/* global imports log */

(()=>{
  const {
    gi: {St, Gio, Gtk, Shell, Meta, Clutter},
    ui: {main: Main, modalDialog: {ModalDialog}},
    lang: Lang,
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {getSettings, wsWindows, moveResize, moveResizeRect, rectIntersect, rectEnclosed, copyRect}
  } = Me.imports;

  // const logr = (st)=>{
  //   log(JSON.stringify(copyRect(st)));
  // };

  const timeDescCompare = (a, b)=> b.user_time - a.user_time;

  const initTile = ()=>{
    const mon = global.display.get_current_monitor();
    const iw = Array.from(wsWindows(void 0, mon)).sort(timeDescCompare);
    if (iw.length == 0) return {};

    const iwm = iw[0];
    const ws = iwm.get_workspace();
    const {x, y, width, height} = ws.get_work_area_for_monitor(mon);
    return {iw, x, y, width, height};
  };

  const tileWindows = () => {
    const ss = initTile();
    const {iw} = ss;
    if (iw === void 0) return;
    const rects = iw.map((w) => w.get_frame_rect());
    for(let i = rects.length - 1; i >= 0; --i) {
      const a = rects[i];
      for(const b of rects) {
        if (a === b) continue;
        rectEnclosed(b, a) || ! rectIntersect(a, b) || shrinkRect(a, b);
      }
    }

    for(let i = 0; i < rects.length; ++i) {
      const a = rects[i];
      const max = {l: ss.x, t: ss.y, r: ss.x+ss.width, b: ss.y+ss.height};
      let found = false;
      for (const b of rects) {
        if (a === b) continue;
        restrictMax(max, a, b);
      }
      moveResize(iw[i], max.l, max.t, max.r-max.l, max.b-max.t);
    }
  };

  const xIntersect = (a, b)=> a.x+a.width > b.x && a.x < b.x+b.width;
  const yIntersect = (a, b)=> a.y+a.height > b.y && a.y < b.y+b.height;
  const isAbove = (a, b)=> a.y+a.height <= b.y;
  const isLeft = (a, b)=> a.x+a.width <= b.x;

  const restrictMax = (max, me, limit)=>{
    if (limit.x+limit.width <= max.l || limit.x >= max.r ||
        limit.y+limit.height <= max.t || limit.y >= max.b)
      return;
    if (xIntersect(limit, me)) {
      if (isAbove(me, limit)) {
        if (max.b > limit.y-1) max.b = limit.y;
      } else if (isAbove(limit, me)) {
        const limit_b = limit.y+limit.height;
        if (max.t < limit_b) max.t = limit_b;
      }
    } {
      if (isLeft(me, limit)) {
        if (max.r > limit.x-1) max.r = limit.x;
      } else if (isLeft(limit, me)) {
        const limit_r = limit.x+limit.width;
        if (max.l < limit_r) max.l = limit_r;
      }
    }
  };

  const expandRect = (fw, max, windows)=>{
    const me = fw.get_frame_rect();
    for(const mw of windows) {
      if (mw === fw) continue;
      const candidate = mw.get_frame_rect();
      rectIntersect(me, candidate, 1) || restrictMax(max, me, candidate);
    }
  };

  const expandWindow = ()=>{
    const ss = initTile();
    if (ss.iw === void 0) return;
    const fw = ss.iw[0];

    const max = {l: ss.x, t: ss.y, r: ss.x+ss.width, b: ss.y+ss.height};

    expandRect(fw, max, ss.iw);
    moveResize(fw, max.l, max.t, max.r-max.l, max.b-max.t);
  };

  const shrinkRect = (rect, limit)=>{
    const xi = xIntersect(rect, limit);
    const yi = yIntersect(rect, limit);
    const limit_r = limit.x+limit.width + 1;
    const limit_b = limit.y+limit.height + 1;
    let dl = xi && limit.x < rect.x ? rect.x - limit_r : 1;
    let dt = yi && limit.y < rect.y ? rect.y - limit_b : 1;
    const rect_r = rect.x + rect.width + 1;
    const rect_b = rect.y + rect.height + 1;
    let dr = xi && limit_r > rect_r ? limit.x - rect_r : 1;
    let db = yi && limit_b > rect_b ? limit.y - rect_b : 1;

    if (dr < 0 && dl < 0)
      dr = dl = 1;

    if (db < 0 && dt < 0)
      dt = db = 1;

    const dw = dl < 0 ? dl : dr,
          dh = dt < 0 ? dt : db;
    log(JSON.stringify({xi, yi, dl, dt, dr, db, dw, dh}));

    if ((dh > 0 || dw > dh) && dw < 0) {
      if (dw == dl) {
        rect.width += dl;
        rect.x = limit_r;
      } else {
        rect.width += dr;
      }
    } else if (dh < 0) {
       if (dh == dt) {
        rect.height += dt;
        rect.y = limit_b;
      } else {
        rect.height += db;
      }
    }
  };

  const contractWindow = ()=>{
    const {iw} = initTile();
    if (iw === void 0) return;
    const fw = iw[0];
    const orig = fw.get_frame_rect();
    const me = copyRect(orig);

    log(`me `+ JSON.stringify(me));

    for(const mw of iw) {
      if (mw === fw) continue;
      const limit = mw.get_frame_rect();
      log(`o `+ JSON.stringify(copyRect(limit)));
      log(`me in limit ${rectEnclosed(me, limit)}, n ${rectIntersect(me, limit)}`);
      ! rectEnclosed(me, limit) && rectIntersect(me, limit) && shrinkRect(me, limit);
      ! rectEnclosed(me, limit) && rectIntersect(me, limit) && log(`shrink ${JSON.stringify(me)}`)
    }

    if (me.width < orig.width || me.height < orig.height)
      moveResize(fw, me.x, me.y, me.width, me.height);
  };

  class TileManager {
    constructor(commandManager) {
      commandManager.addCommand('1', '[1]column', ()=>{
        const iw = Array.from(wsWindows()).sort(timeDescCompare);

        for(let i = iw.length-1; i >= 0; --i) {
          iw[i].maximize(Meta.MaximizeFlags.BOTH);
          iw[i].raise();
        }
      });
      commandManager.addCommand('2', '[2]columns', ()=>{
        const {iw, x, y, width, height} = initTile();
        if (iw === undefined) return;

        const iwLen = iw.length;

        const hh = height>>1, hw = width>>1;

        moveResize(iw[0], x, y, hw, iwLen > 3 ? hh : height);
        if (iwLen == 1)
          return;
        moveResize(iw[1], x+hw, y, hw, iwLen > 2 ? hh : height);
        if (iwLen == 2) return;
        moveResize(iw[2], x+hw, y+hh, hw,  hh);
        const ph = Math.floor(hh/(iwLen-3));
        for(let i = 3; i < iwLen; ++i) {
          moveResize(iw[i], x, y+hh+(ph*(i-3)), hw, ph);
        }
      });
      commandManager.addCommand('3', '[3]columns', ()=>{
        const {iw, x, y, width, height} = initTile();
        if (iw === undefined) return;

        const iwLen = iw.length;

        const hh = height>>1, midWidth = width>>1, sideWidth = midWidth>>1;

        moveResize(iw[0], sideWidth+x, y, midWidth, height);
        if (iwLen == 1)
          return;
        moveResize(iw[1], width-sideWidth, y, sideWidth, iwLen > 3 ? hh : height);
        if (iwLen == 2) return;
        if (iwLen == 3)
          moveResize(iw[2], x, y, sideWidth,  height);
        else {
          moveResize(iw[2], width-sideWidth, y+hh, sideWidth,  hh);
          const ph = Math.floor(height/(iwLen-3));
          for(let i = 3; i < iwLen; ++i) {
            moveResize(iw[i], x, y+(ph*(i-3)), sideWidth, ph);
          }
        }
      });

      commandManager.addCommand('t', '[t]ile', tileWindows);
      commandManager.addCommand('x', 'e[x]pand', expandWindow);
      commandManager.addCommand('c', '[c]ontract', contractWindow);
    }


    destroy() {
    }
  }

  Me.imports.TileManager = TileManager;
})();
