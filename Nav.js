/* global imports log */

var {Manager} = (()=>{

  const {
    gi: {St, Gio, Shell, Meta},
    ui: {main: Main, appFavorites},
  } = imports;

  const Me = imports.misc.extensionUtils.getCurrentExtension();
  const {Convenience, GeoSwitch} = Me.imports;

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

    focusPointer() {GeoSwitch.Pointer.focus()}

    destroy() {
      this._dbusImpl.unexport();
      this._dbusImpl = null;
    }
  }

  class Manager {
    constructor() {
      this._settings = Convenience.getSettings('org.gnome.shell.extensions.my-setup');

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
        GeoSwitch.Pointer.focus
      );
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
