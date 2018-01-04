/* global imports log */

var {Manager} = (()=>{

  const {
    gi: {St, Gio, Shell, Meta},
    ui: {main: Main, appFavorites},
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {pointInRect, rectIntersect, getSettings}
  } = Me.imports;

  const cmds = new Array(4);

  const DBUS_IF = `
<node>
 <interface name="org.gnome.Shell.mySetup">
   <method name="activateFav">
     <arg type="s" direction="in" />
   </method>
   <method name="focusPointer">
     <arg type="s" direction="in" />
   </method>
 </interface>
</node>
`;

  const getCenter = window=>{
    const rect = window.get_frame_rect();
    return {x: rect.x+(rect.width>>1), y: rect.y+(rect.height>>1)};
  };

  const focusWindowDir = viableMag=>{
    const window = global.display.get_focus_window();
    if (window == null) return;

    const {screen} = global;

    const windows = imports.gi.Meta.get_window_actors(screen);

    const cws = screen.get_active_workspace();

    const myPos = getCenter(window);
    let bestMag = -1, bestWindow;

    for(let i = windows.length-1; i >= 0; --i) {
      const mw = windows[i].metaWindow;
      if (window === mw || mw.get_window_type() !== 0 || mw.get_workspace() !== cws)
        continue;

      const cPos = getCenter(mw);
      if (viableMag(myPos, cPos)) {
        const x = myPos.x - cPos.x, y = myPos.y - cPos.y;
        const mag = x*x + y*y;
        if (bestMag == -1 || mag < bestMag) {
          bestMag = mag;
          bestWindow = mw;
        }
      }
    }

    bestWindow === undefined || bestWindow.focus(global.get_current_time());
  };


  const findTopWindowAt = (x, y, not_me)=>{
    const windows = imports.gi.Meta.get_window_actors(global.screen);

    const cws = global.screen.get_active_workspace();

    for(let i = windows.length-1; i >= 0; --i) {
      const mw = windows[i].metaWindow;
      if (mw !== not_me && mw.get_window_type() == 0 && mw.get_workspace() === cws &&
          pointInRect(x, y, mw.get_frame_rect()))
        return mw;
    }
  };


  const focusPointer = (not_me)=>{
    const [x, y] = global.get_pointer();
    const mw = findTopWindowAt(x, y, not_me);
    mw === undefined || mw.has_focus() || mw.focus(global.get_current_time());
  };

  const raiseOrLower = (display, screen=global.screen, window) =>{
    if (window == null) {
      const [x, y] = global.get_pointer();
      window = findTopWindowAt(x, y);
      if (window === undefined) return;
    }
    const windows = imports.gi.Meta.get_window_actors(screen);

    const cws = screen.get_active_workspace();

    const rect = window.get_frame_rect();

    for(let i = windows.length-1; i >= 0; --i) {
      const mw = windows[i].metaWindow;
      if (mw.get_window_type() !== 0 || mw.get_workspace() !== cws)
        continue;
      if (window === mw)
        break;

      if (rectIntersect(rect, mw.get_frame_rect())) {
        window.raise();
        window.has_focus() || window.focus(global.get_current_time());
        return;
      }
    }

    window.lower();
    focusPointer(window);
  };

  class DBusAction {
    constructor() {
      this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBUS_IF, this);
      this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/mySetup');
    }

    activateFav(str) {
      const num = +str;
      if (! (num > 0 && num < 10)) return;
      const favs = appFavorites.getAppFavorites().getFavoriteMap();
      let i = 0;
      for (const id in favs) {
        if (++i == num) {
          const fav = favs[id];
          let workspace = global.screen.get_workspace_by_index(num-1);
          if (workspace !== null && global.screen.get_active_workspace() !== workspace)
            workspace.activate(global.get_current_time());
          fav.activate();
          return;
        }
      }
    }

    focusPointer() {focusPointer()}

    destroy() {
      this._dbusImpl.unexport();
      this._dbusImpl = null;
    }
  }

  class Manager {
    constructor() {
      this._settings = getSettings();

      this._dbusAction = new DBusAction();

      for(let i = 1; i < 10; ++i) {
        const workspace = i;
        Main.wm.addKeybinding(
          `app-hotkey-${i}`, this._settings,
          Meta.KeyBindingFlags.NONE,
          Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
          ()=>{
            this._dbusAction.activateFav(workspace);
          });
      }

      Main.wm.addKeybinding(
        'focus-window', this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        ()=>focusPointer()
      );

      Main.wm.addKeybinding(
        'raise-or-lower-and-focus', this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        raiseOrLower
      );

      const DELTA = 20;

      const BETTER = {
        left: (myPos, cPos) => myPos.x > cPos.x && (myPos.x - cPos.x) > DELTA,
        up: (myPos, cPos) => myPos.y > cPos.y && (myPos.y - cPos.y) > DELTA,
        right: (myPos, cPos) => myPos.x < cPos.x && (cPos.x - myPos.x) > DELTA,
        down: (myPos, cPos) => myPos.y < cPos.y && (cPos.y - myPos.y) > DELTA,
      };
      for (const name in BETTER) {
        Main.wm.addKeybinding(
          `focus-window-${name}`, this._settings,
          Meta.KeyBindingFlags.NONE,
          Shell.ActionMode.NORMAL,
          ()=>{focusWindowDir(BETTER[name])},
        );
      }
    }

    destroy() {
      for(let i = 1; i < 10; ++i) {
        Main.wm.removeKeybinding(`app-hotkey-${i}`);
      }
      this._dbusAction.destroy();
      this._dbusAction = null;
    }
  }
  return {Manager};
})();
