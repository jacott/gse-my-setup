/* global imports log */

var Manager = (()=>{
  const {
    gi: {St, Gio, Gtk, Shell, Meta, Clutter},
    ui: {main: Main, modalDialog: {ModalDialog}},
    lang: Lang,
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {getSettings, DisplayWrapper, wsWindows}
  } = Me.imports;

  const timeDescCompare = (a, b)=> b.user_time - a.user_time;

  const unmax = (mw)=>{
    const m = mw.get_maximized();
    if (m != 0)
      mw.unmaximize(m);
  };

  const moveResize = (mw, x, y, w, h)=>{
    unmax(mw);
    mw.move_resize_frame(true, x, y, w, h);
  };

  class Manager {
    constructor(commandManager) {
      // commandManager.addCommand('2', '[2]columns', ()=>{
      //   log('2 cols :)');
      // });
      commandManager.addCommand('3', '[3]columns', ()=>{
        const iw = Array.from(wsWindows()).sort(timeDescCompare);
        const iwLen = iw.length;
        if (iwLen == 0) return;

        const iwm = iw[0];
        const ws = iwm.get_workspace();
        const {x, y, width, height} = ws.get_work_area_for_monitor(iwm.get_monitor());

        const hh = height>>1, midWidth = width>>1, sideWidth = midWidth>>1;

        // log('maxSize = '+maxSize.x+", "+maxSize.y+", "+maxSize.width+", "+maxSize.height);

        moveResize(iw[0], sideWidth+x, y, midWidth, height);
        if (iwLen != 0)
          moveResize(iw[1], width-sideWidth, y, sideWidth, iwLen > 3 ? hh : height);
        if (iwLen <= 3)
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
