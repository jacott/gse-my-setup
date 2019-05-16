/* global imports log */

var Manager = (()=>{
  const {
    gi: {St, Gio, Gtk, Shell, Meta, Clutter},
    ui: {main: Main, modalDialog: {ModalDialog}},
    lang: Lang,
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {getSettings, wsWindows, moveResize, rectIntersect, rectEnclosed, copyRect}
  } = Me.imports;

  // const logr = (st)=>{
  //   log(JSON.stringify(copyRect(st)));
  // };

  const timeDescCompare = (a, b)=> b.user_time - a.user_time;

  const initTile = ()=>{
    const iw = Array.from(wsWindows()).sort(timeDescCompare);
    const iwLen = iw.length;
    if (iwLen == 0) return {};

    const iwm = iw[0];
    const ws = iwm.get_workspace();
    const {x, y, width, height} = ws.get_work_area_for_monitor(iwm.get_monitor());
    return {iw, x, y, width, height};
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
        log ("isLeft limit < me");
        const limit_r = limit.x+limit.width;
        if (max.l < limit_r) max.l = limit_r;
      }
    }
  };

  const expandRect = (fw, max)=>{
    const me = fw.get_frame_rect();
    for(const mw of wsWindows()) {
      if (mw === fw) continue;
      const candidate = mw.get_frame_rect();
      rectIntersect(me, candidate, 1) || restrictMax(max, me, candidate);
    }
  };

  const expandWindow = ()=>{
    const ss = initTile();
    if (ss.iw === void 0) return;
    const max = {l: ss.x, t: ss.y, r: ss.x+ss.width, b: ss.y+ss.height};

    const fw = global.display.get_focus_window();
    expandRect(fw, max);
    moveResize(fw, max.l, max.t, max.r-max.l, max.b-max.t);
  };

  const shrinkMe = (me, limit)=>{
    const xi = xIntersect(me, limit);
    const yi = yIntersect(me, limit);
    const limit_r = limit.x+limit.width + 1;
    const limit_b = limit.y+limit.height + 1;
    let dl = xi && limit.x < me.x ? me.x - limit_r : 1;
    let dt = yi && limit.y < me.y ? me.y - limit_b : 1;
    const me_r = me.x + me.width + 1;
    const me_b = me.y + me.height + 1;
    let dr = xi && limit_r > me_r ? limit.x - me_r : 1;
    let db = yi && limit_b > me_b ? limit.y - me_b : 1;

    if (dr < 0 && dl < 0)
      dr = dl = 1;

    if (db < 0 && dt < 0)
      dt = db = 1;

    const dw = dl < 0 ? dl : dr,
          dh = dt < 0 ? dt : db;

    if ((dh > 0 || dw > dh) && dw < 0) {
      if (dw == dl) {
        me.width += dl;
        me.x = limit_r;
      } else {
        me.width += dr;
      }
    } else if (dh < 0) {
       if (dh == dt) {
        me.height += dt;
        me.y = limit_b;
      } else {
        me.height += db;
      }
    }
  };

  const contractWindow = ()=>{
    const fw = global.display.get_focus_window();
    const orig = fw.get_frame_rect();
    const me = copyRect(orig);

    for(const mw of wsWindows()) {
      if (mw === fw) continue;
      const limit = mw.get_frame_rect();
      rectEnclosed(me, limit) || rectEnclosed(limit, me) || ! rectIntersect(me, limit) ||
        shrinkMe(me, limit);
    }

    if (me.width < orig.width || me.height < orig.height)
      moveResize(fw, me.x, me.y, me.width, me.height);
  };

  class Manager {
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

      commandManager.addCommand('x', 'e[x]pand', expandWindow);
      commandManager.addCommand('c', '[c]ontract', contractWindow);
    }


    destroy() {
    }
  }

  return Manager;
})();
