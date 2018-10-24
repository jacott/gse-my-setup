/* global imports log */

var Manager = (()=>{
  const {
    gi: {St, Gio, Gtk, Shell, Meta, Clutter},
    ui: {main: Main, modalDialog: {ModalDialog}},
    lang: Lang,
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {getSettings, DisplayWrapper, wsWindows, moveResize}
  } = Me.imports;

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

        // log('maxSize = '+maxSize.x+", "+maxSize.y+", "+maxSize.width+", "+maxSize.height);

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

        // log('maxSize = '+maxSize.x+", "+maxSize.y+", "+maxSize.width+", "+maxSize.height);

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
    }


    destroy() {
    }
  }

  return Manager;
})();
