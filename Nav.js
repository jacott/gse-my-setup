/* global imports log */

var {Manager} = (()=>{

  const {
    gi: {St, Gio, Shell, Meta},
    ui: {main: Main, appFavorites},
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {
    Utils: {pointInRect, rectIntersect, getSettings, DisplayWrapper, wsWindows}
  } = Me.imports;

  const cmds = new Array(4);

  const DBUS_IF = `
<node>
 <interface name="org.gnome.Shell.mySetup">
   <method name="activateFav">
     <arg type="s" direction="in" />
   </method>
   <method name="switchWs">
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

    const myPos = getCenter(window);
    let bestMag = -1, bestWindow;

    for(const mw of wsWindows()) {
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


  const findTopWindowAt = (windows, x, y, not_me)=>{
    for(let i = windows.length-1; i >= 0; --i) {
      const mw = windows[i];
      if (mw !== not_me && pointInRect(x, y, mw.get_frame_rect()))
        return mw;
    }
  };

  const stackingOrderWindows = (
    ws=DisplayWrapper.getWorkspaceManager().get_active_workspace()
  )=> DisplayWrapper.getScreen().sort_windows_by_stacking(ws.list_windows());

  const focusPointer = (not_me)=>{
    const [x, y] = global.get_pointer();
    const mw = findTopWindowAt(stackingOrderWindows(), x, y, not_me);
    mw === undefined || mw.has_focus() || mw.focus(global.get_current_time());
    global.display.get_focus_window();
  };

  const raiseOrLower = () =>{
    const [x, y] = global.get_pointer();
    const windows = stackingOrderWindows();
    const window = findTopWindowAt(windows, x, y) || global.display.get_focus_window();
    if (window === undefined) return;

    const rect = window.get_frame_rect();

    for(let i = windows.length-1; i >= 0; --i) {
      const mw = windows[i];
      if (window === mw)
        break;

      if (rectIntersect(rect, mw.get_frame_rect(), 10)) {
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
          const wsm = DisplayWrapper.getWorkspaceManager();
          let workspace = wsm.get_workspace_by_index(num-1);
          if (workspace !== null && wsm.get_active_workspace() !== workspace)
            workspace.activate(global.get_current_time());
          fav.activate();
          return;
        }
      }
    }

    switchWs(str) {
      const num = +str;
      if (! (num > 0 && num < 10)) return;
      const wsm = DisplayWrapper.getWorkspaceManager();
      let workspace = wsm.get_workspace_by_index(num-1);
      if (workspace === null || wsm.get_active_workspace() === workspace)
        return;

      let bt = 0, bw;
      for (const mw of wsWindows(workspace, true)) {
        const t = mw.get_user_time();
        if (mw.user_time > bt) {
          bt = mw.user_time;
          bw = mw;
        }
      }

      if (bw !== undefined) {
        workspace.activate_with_focus(bw, global.get_current_time());
      } else {
        workspace.activate(global.get_current_time());
      }
    }

    focusPointer() {focusPointer()}

    destroy() {
      this._dbusImpl.unexport();
      this._dbusImpl = null;
    }
  }

  const DELTA = 20;

  const BETTER = {
    left: (myPos, cPos) => myPos.x > cPos.x && (myPos.x - cPos.x) > DELTA,
    up: (myPos, cPos) => myPos.y > cPos.y && (myPos.y - cPos.y) > DELTA,
    right: (myPos, cPos) => myPos.x < cPos.x && (cPos.x - myPos.x) > DELTA,
    down: (myPos, cPos) => myPos.y < cPos.y && (cPos.y - myPos.y) > DELTA,
  };


  class Manager {
    constructor(commandManager) {
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
        Main.wm.addKeybinding(
          `hotkey-${i}`, this._settings,
          Meta.KeyBindingFlags.NONE,
          Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
          ()=>{
            this._dbusAction.switchWs(workspace);
          });
      }

      commandManager.addCommand('f', '[f]ocus', ()=>{
        focusPointer();
      });

      Main.wm.addKeybinding(
        'raise-or-lower-and-focus', this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        ()=>{raiseOrLower()},
      );

      for (const name in BETTER) {
        Main.wm.addKeybinding(
          `focus-window-${name}`, this._settings,
          Meta.KeyBindingFlags.NONE,
          Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
          ()=>{focusWindowDir(BETTER[name])},
        );
      }
    }

    destroy() {
      for(let i = 1; i < 10; ++i) Main.wm.removeKeybinding(`app-hotkey-${i}`);
      Main.wm.removeKeybinding('raise-or-lower-and-focus');
      Main.wm.removeKeybinding('focus-window');
      for (const name in BETTER) Main.wm.removeKeybinding(`focus-window-${name}`);

      this._dbusAction.destroy();
      this._dbusAction = null;
    }
  }
  return {Manager};
})();
