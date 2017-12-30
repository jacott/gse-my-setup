/* global imports log */

const {
  gi: {St, Gio, Shell, Meta},
  ui: {main: Main},
} = imports;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Convenience} = Me.imports;

const cmds = new Array(4);

const DBUS_IF = `
<node>
 <interface name="org.gnome.Shell.mySetup">
   <method name="activateFav">
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
    log(`action ${str}`);
  }
}

class Manager {
  constructor() {
    this._settings = Convenience.getSettings('org.gnome.shell.extensions.my-setup');

    Main.wm.addKeybinding(
      `app-hotkey-1`, this._settings,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      ()=>{
        log('xx super-1 :)');
      });
    this._dbusAction = new DBusAction();
  }

  destroy() {
    this._dbusAction = null;
  }
}
